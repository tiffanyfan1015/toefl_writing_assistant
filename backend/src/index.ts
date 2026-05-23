import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Prisma, PrismaClient } from "@prisma/client";
import { evaluateEssay, generateQuestion } from "./services/gemini.js";
import { requireApiKey } from "./middleware/auth.js";
import { normalizeErrorType } from "./lib/errorTypes.js";

dotenv.config();

function validateEnv(): void {
  if (!process.env.GEMINI_API_KEY) {
    console.error("FATAL: GEMINI_API_KEY is not set");
    process.exit(1);
  }
  if (!process.env.API_KEY) {
    console.error("FATAL: API_KEY is not set");
    process.exit(1);
  }
}

validateEnv();

export const app = express();
const prisma = new PrismaClient();
const port = parseInt(process.env.PORT || "3001", 10);
const bindHost = process.env.BIND_ADDRESS ?? "127.0.0.1";

const QUESTION_TYPES = ["Email", "Academic"] as const;

function parseIdParam(raw: string): number | null {
  const id = parseInt(raw, 10);
  return Number.isNaN(id) ? null : id;
}

const revisionInclude = {
  revisions: {
    // Contract: revisions are always returned newest-first for clients.
    orderBy: { createdAt: "desc" as const },
    include: { errorLogs: true },
  },
} satisfies Prisma.SubmissionInclude;

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN ?? "http://localhost:5173",
  }),
);
app.use(express.json({ limit: "50kb" }));

app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    return requireApiKey(req, res, next);
  }
  next();
});

app.get("/api/questions", async (_req, res) => {
  try {
    const questions = await prisma.question.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(questions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch questions" });
  }
});

app.get("/api/questions/:id", async (req, res) => {
  const id = parseIdParam(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: "Invalid question id" });
  }

  try {
    const question = await prisma.question.findUnique({ where: { id } });
    if (question) {
      res.json(question);
    } else {
      res.status(404).json({ error: "Question not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch question" });
  }
});

app.post("/api/questions", async (req, res) => {
  const { type, title, content, autoGenerate } = req.body;

  if (!(QUESTION_TYPES as readonly string[]).includes(type)) {
    return res.status(400).json({
      error: "Invalid type. Must be Email or Academic.",
    });
  }

  try {
    let finalTitle = title;
    let finalContent = content;

    if (autoGenerate) {
      const generated = await generateQuestion(type);
      finalTitle = generated.title;
      finalContent = generated.content;
    }

    const question = await prisma.question.create({
      data: {
        type,
        title: finalTitle,
        content: finalContent,
      },
    });
    res.json(question);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create question" });
  }
});

app.delete("/api/questions/:id", async (req, res) => {
  const id = parseIdParam(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: "Invalid question id" });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.errorLog.deleteMany({
        where: { revision: { submission: { questionId: id } } },
      });
      await tx.submissionRevision.deleteMany({
        where: { submission: { questionId: id } },
      });
      await tx.submission.deleteMany({ where: { questionId: id } });
      await tx.question.delete({ where: { id } });
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete question" });
  }
});

app.get("/api/questions/:id/latest-submission", async (req, res) => {
  const questionId = parseIdParam(req.params.id);
  if (questionId === null) {
    return res.status(400).json({ error: "Invalid question id" });
  }

  try {
    const submission = await prisma.submission.findFirst({
      where: { questionId },
      include: revisionInclude,
      orderBy: { createdAt: "desc" },
    });

    if (!submission) {
      return res.status(404).json({ error: "No submission found" });
    }

    res.json(submission);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch submission" });
  }
});

app.post("/api/submissions", async (req, res) => {
  const { questionId, text } = req.body;

  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Essay text is required" });
  }
  if (text.length > 10000) {
    return res.status(400).json({ error: "Essay too long" });
  }

  const question = await prisma.question.findUnique({
    where: { id: questionId },
  });

  if (!question) {
    return res.status(404).json({ error: "Question not found" });
  }

  let evaluation = null;
  let evaluationFailed = false;
  try {
    evaluation = await evaluateEssay(
      question.type as "Email" | "Academic",
      question.content,
      text,
    );
  } catch (error) {
    evaluationFailed = true;
    console.error("Gemini Evaluation Failed:", error);
  }

  try {
    const revisionData: Prisma.SubmissionRevisionCreateWithoutSubmissionInput =
      {
        text,
        score: evaluation?.score ?? null,
        feedback: evaluation?.feedback ?? null,
      };

    if (evaluation && Array.isArray(evaluation.errors)) {
      revisionData.errorLogs = {
        create: evaluation.errors.map((err) => ({
          errorType: normalizeErrorType(err.type),
          incorrect: err.incorrect,
          suggestion: err.suggestion,
          explanation: err.explanation || null,
        })),
      };
    }

    const submission = await prisma.submission.upsert({
      where: { questionId },
      create: {
        questionId,
        currentText: text,
        latestScore: evaluation?.score ?? null,
        revisions: { create: revisionData },
      },
      update: {
        currentText: text,
        latestScore: evaluation?.score ?? null,
        revisions: { create: revisionData },
      },
      include: revisionInclude,
    });

    res.json({ submission, evaluation, evaluationFailed });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to process submission" });
  }
});

app.get("/api/error-logs", async (_req, res) => {
  try {
    const logs = await prisma.errorLog.findMany({
      include: {
        revision: {
          include: {
            submission: {
              include: {
                question: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch error logs" });
  }
});

app.patch("/api/error-logs/:id/important", async (req, res) => {
  const id = parseIdParam(req.params.id);
  const { important } = req.body;

  if (id === null || typeof important !== "boolean") {
    return res.status(400).json({ error: "Invalid important update payload" });
  }

  try {
    const log = await prisma.errorLog.update({
      where: { id },
      data: { important },
    });
    res.json(log);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update error importance" });
  }
});

const shutdown = async () => {
  await prisma.$disconnect();
  process.exit(0);
};

if (!process.env.VITEST) {
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  app.listen(port, bindHost, () => {
    console.log(`Server running on http://${bindHost}:${port}`);
  });
}
