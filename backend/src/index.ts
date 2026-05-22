import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { evaluateEssay, generateQuestion } from "./services/gemini.js";
import { requireApiKey } from "./middleware/auth.js";

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

app.get("/api/questions", async (req, res) => {
  const questions = await prisma.question.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.json(questions);
});

app.get("/api/questions/:id", async (req, res) => {
  const question = await prisma.question.findUnique({
    where: { id: parseInt(req.params.id) },
  });
  if (question) {
    res.json(question);
  } else {
    res.status(404).json({ error: "Question not found" });
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
    res.status(500).json({
      error: "Failed to create question",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.delete("/api/questions/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await prisma.errorLog.deleteMany({
      where: { revision: { submission: { questionId: id } } },
    });
    await prisma.submissionRevision.deleteMany({
      where: { submission: { questionId: id } },
    });
    await prisma.submission.deleteMany({ where: { questionId: id } });
    await prisma.question.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete question" });
  }
});

app.get("/api/questions/:id/latest-submission", async (req, res) => {
  const submission = await prisma.submission.findFirst({
    where: { questionId: parseInt(req.params.id) },
    include: {
      revisions: {
        orderBy: { createdAt: "desc" },
        include: { errorLogs: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(submission);
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
  try {
    evaluation = await evaluateEssay(
      question.type as "Email" | "Academic",
      question.content,
      text,
    );
  } catch (error) {
    console.error("Gemini Evaluation Failed:", error);
  }

  try {
    let submission = await prisma.submission.findFirst({
      where: { questionId },
    });

    const revisionData: any = {
      text,
      score: evaluation?.score ?? null,
      feedback: evaluation?.feedback || null,
    };

    if (evaluation) {
      revisionData.errorLogs = {
        create: evaluation.errors.map((err) => ({
          errorType: err.type,
          incorrect: err.incorrect,
          suggestion: err.suggestion,
          explanation: err.explanation,
        })),
      };
    }

    if (submission) {
      submission = await prisma.submission.update({
        where: { id: submission.id },
        data: {
          currentText: text,
          latestScore: evaluation?.score ?? null,
          revisions: {
            create: revisionData,
          },
        },
        include: {
          revisions: {
            orderBy: { createdAt: "desc" },
            include: { errorLogs: true },
          },
        },
      });
    } else {
      submission = await prisma.submission.create({
        data: {
          question: { connect: { id: questionId } },
          currentText: text,
          latestScore: evaluation?.score ?? null,
          revisions: {
            create: revisionData,
          },
        },
        include: {
          revisions: {
            orderBy: { createdAt: "desc" },
            include: { errorLogs: true },
          },
        },
      });
    }

    res.json({ submission, evaluation });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to process submission" });
  }
});

app.get("/api/error-logs", async (req, res) => {
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
});

app.patch("/api/error-logs/:id/important", async (req, res) => {
  const id = parseInt(req.params.id);
  const { important } = req.body;

  if (Number.isNaN(id) || typeof important !== "boolean") {
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

if (!process.env.VITEST) {
  app.listen(port, bindHost, () => {
    console.log(`Server running on http://${bindHost}:${port}`);
  });
}
