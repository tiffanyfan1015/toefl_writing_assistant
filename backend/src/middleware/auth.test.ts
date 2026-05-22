import { beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";

const mockFindMany = vi.fn().mockResolvedValue([]);

vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(function MockPrismaClient() {
    return {
      question: {
        findMany: mockFindMany,
        findUnique: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
      submission: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        deleteMany: vi.fn(),
      },
      submissionRevision: { deleteMany: vi.fn() },
      errorLog: {
        findMany: vi.fn(),
        update: vi.fn(),
        deleteMany: vi.fn(),
      },
    };
  }),
}));

const authHeader = { Authorization: "Bearer test-api-key" };

let app: Express;

beforeAll(async () => {
  const mod = await import("../index.js");
  app = mod.app;
});

describe("API auth middleware", () => {
  it.each([
    { name: "missing bearer", headers: {} as Record<string, string> },
    { name: "invalid bearer", headers: { Authorization: "Bearer wrong-key" } },
  ])("returns 401 when $name", async ({ headers }) => {
    const res = await request(app).get("/api/questions").set(headers);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Unauthorized" });
  });

  it("allows requests with a valid bearer token", async () => {
    const res = await request(app)
      .get("/api/questions")
      .set(authHeader);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(mockFindMany).toHaveBeenCalled();
  });
});

describe("POST /api/questions validation", () => {
  it.each([
    { name: "invalid type", body: { type: "Malware", title: "t", content: "c" } },
    { name: "missing type", body: { title: "t", content: "c" } },
  ])("returns 400 for $name", async ({ body }) => {
    const res = await request(app)
      .post("/api/questions")
      .set(authHeader)
      .send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid type/);
  });
});

describe("POST /api/submissions validation", () => {
  it("returns 400 when essay exceeds 10000 characters", async () => {
    const res = await request(app)
      .post("/api/submissions")
      .set(authHeader)
      .send({ questionId: 1, text: "x".repeat(10001) });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Essay too long" });
  });
});
