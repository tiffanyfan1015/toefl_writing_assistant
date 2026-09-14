import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";

const backendRoot = path.dirname(fileURLToPath(import.meta.url));
const testDbPath = path.join(backendRoot, "../test.db");

vi.mock("./services/gemini.js", () => ({
  generateQuestion: vi.fn(),
  evaluateEssay: vi.fn().mockResolvedValue({
    score: 4,
    feedback: "Good work",
    errors: [],
  }),
  resolveGeminiModel: vi.fn().mockReturnValue("gemini-2.0-flash"),
}));

process.env.DATABASE_URL = `file:${testDbPath}`;
process.env.API_KEY = "test-api-key";
process.env.GEMINI_API_KEY = "test-gemini-key";
process.env.VITEST = "true";

const authHeader = { Authorization: "Bearer test-api-key" };

let app: import("express").Express;
let prisma: PrismaClient;

beforeAll(async () => {
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  execSync("npx prisma db push --skip-generate", {
    cwd: path.join(backendRoot, ".."),
    stdio: "pipe",
  });

  prisma = new PrismaClient();
  const mod = await import("./index.js");
  app = mod.app;
});

afterAll(async () => {
  await prisma.$disconnect();
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
});

describe("GET /api/questions/:id/latest-submission", () => {
  it("returns 404 when no submission exists", async () => {
    const question = await prisma.question.create({
      data: { type: "Email", title: "T", content: "C" },
    });

    const res = await request(app)
      .get(`/api/questions/${question.id}/latest-submission`)
      .set(authHeader);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "No submission found" });
  });
});

describe("POST /api/submissions upsert", () => {
  it("creates then updates a single submission per questionId", async () => {
    const question = await prisma.question.create({
      data: { type: "Email", title: "Upsert", content: "Prompt" },
    });

    const first = await request(app)
      .post("/api/submissions")
      .set(authHeader)
      .send({ questionId: question.id, text: "first draft" });

    expect(first.status).toBe(200);
    expect(first.body.evaluationFailed).toBe(false);

    const second = await request(app)
      .post("/api/submissions")
      .set(authHeader)
      .send({ questionId: question.id, text: "second draft" });

    expect(second.status).toBe(200);

    const submissions = await prisma.submission.findMany({
      where: { questionId: question.id },
    });
    expect(submissions).toHaveLength(1);
    expect(submissions[0]?.currentText).toBe("second draft");
  });

  it("returns evaluationFailed when Gemini throws", async () => {
    const { evaluateEssay } = await import("./services/gemini.js");
    vi.mocked(evaluateEssay).mockRejectedValueOnce(new Error("Gemini down"));

    const question = await prisma.question.create({
      data: { type: "Email", title: "Fail", content: "Prompt" },
    });

    const res = await request(app)
      .post("/api/submissions")
      .set(authHeader)
      .send({ questionId: question.id, text: "essay" });

    expect(res.status).toBe(200);
    expect(res.body.evaluationFailed).toBe(true);
    expect(res.body.submission).toBeDefined();
  });
});

describe("DELETE /api/questions/:id cascade", () => {
  it("removes all related rows", async () => {
    const question = await prisma.question.create({
      data: { type: "Email", title: "Delete me", content: "C" },
    });

    const submission = await prisma.submission.create({
      data: {
        questionId: question.id,
        currentText: "text",
        revisions: {
          create: {
            text: "rev",
            errorLogs: {
              create: {
                errorType: "Grammar and Spelling",
                incorrect: "a",
                suggestion: "b",
              },
            },
          },
        },
      },
      include: { revisions: { include: { errorLogs: true } } },
    });

    const res = await request(app)
      .delete(`/api/questions/${question.id}`)
      .set(authHeader);

    expect(res.status).toBe(200);

    expect(
      await prisma.question.findUnique({ where: { id: question.id } }),
    ).toBeNull();
    expect(
      await prisma.submission.count({ where: { questionId: question.id } }),
    ).toBe(0);
    expect(
      await prisma.submissionRevision.count({
        where: { submissionId: submission.id },
      }),
    ).toBe(0);
    expect(
      await prisma.errorLog.count({
        where: { revision: { submissionId: submission.id } },
      }),
    ).toBe(0);
  });
});

describe("GET /api/writing-search", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/writing-search?q=ab");
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid query", async () => {
    const res = await request(app)
      .get("/api/writing-search?q=a")
      .set(authHeader);

    expect(res.status).toBe(400);
  });

  it("returns 400 for query longer than 200 characters", async () => {
    const res = await request(app)
      .get(`/api/writing-search?q=${"x".repeat(201)}`)
      .set(authHeader);

    expect(res.status).toBe(400);
  });

  it("returns empty results when no submissions match", async () => {
    const res = await request(app)
      .get("/api/writing-search?q=zzzz")
      .set(authHeader);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ matches: [], total: 0, truncated: false });
  });

  it("returns matches across questions", async () => {
    const q1 = await prisma.question.create({
      data: { type: "Email", title: "Essay A", content: "Prompt" },
    });
    const q2 = await prisma.question.create({
      data: { type: "Academic", title: "Essay B", content: "Prompt" },
    });

    await request(app)
      .post("/api/submissions")
      .set(authHeader)
      .send({ questionId: q1.id, text: "The climate is warming quickly." });

    await request(app)
      .post("/api/submissions")
      .set(authHeader)
      .send({ questionId: q2.id, text: "No relevant words here." });

    const res = await request(app)
      .get("/api/writing-search?q=climate")
      .set(authHeader);

    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
    expect(res.body.matches[0]).toMatchObject({
      questionId: q1.id,
      questionTitle: "Essay A",
      revisionLabel: "LATEST",
    });
    expect(res.body.matches[0].snippet.toLowerCase()).toContain("climate");
  });

  it("truncates at 200 matches", async () => {
    const question = await prisma.question.create({
      data: { type: "Email", title: "Long essay", content: "Prompt" },
    });

    await request(app)
      .post("/api/submissions")
      .set(authHeader)
      .send({ questionId: question.id, text: "aa ".repeat(250) });

    const res = await request(app)
      .get("/api/writing-search?q=aa")
      .set(authHeader);

    expect(res.status).toBe(200);
    expect(res.body.matches).toHaveLength(200);
    expect(res.body.truncated).toBe(true);
    expect(res.body.total).toBeGreaterThanOrEqual(200);
  });
});

describe("id param validation", () => {
  it.each([
    { method: "get" as const, path: "/api/questions/abc" },
    { method: "delete" as const, path: "/api/questions/abc" },
    { method: "get" as const, path: "/api/questions/abc/latest-submission" },
  ])("$method $path returns 400 for invalid id", async ({ method, path }) => {
    const res = await request(app)[method](path).set(authHeader);
    expect(res.status).toBe(400);
  });
});
