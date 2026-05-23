import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Prisma, PrismaClient } from "@prisma/client";
import { mkdirSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  evaluateEssay,
  evaluateSpeakingResponse,
  generateQuestion,
  generateSpeakingQuestion,
  getGeminiModelConfig,
  resolveGeminiModel,
  transcribeSpeakingAudio,
} from "./services/gemini.js";
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

const uploadRoot = path.resolve("uploads");
const speakingUploadRoot = path.join(uploadRoot, "speaking");

mkdirSync(speakingUploadRoot, { recursive: true });

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

// --- Helper Functions for Speaking ---

function ensureString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function getRequestedGeminiModel(req: express.Request) {
  return resolveGeminiModel(req.header("x-gemini-model"));
}

function extensionForMime(mimeType: string) {
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3";
  return "webm";
}

function decodeDataUrl(dataUrl: string) {
  if (!dataUrl.startsWith("data:")) {
    throw new Error("Invalid audio payload");
  }

  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex === -1) {
    throw new Error("Invalid audio payload");
  }

  const header = dataUrl.slice(5, commaIndex);
  const base64 = dataUrl.slice(commaIndex + 1);
  if (!header || !base64) {
    throw new Error("Invalid audio payload");
  }

  const mimeType = header.split(";")[0];
  if (!mimeType) {
    throw new Error("Invalid audio payload");
  }

  return {
    mimeType,
    buffer: Buffer.from(base64, "base64"),
  };
}

function speakingPromptForPart(
  question: {
    introduction: string;
    question1: string;
    question2: string;
    question3: string;
    question4: string;
  },
  partIndex: number,
) {
  switch (partIndex) {
    case 0:
      return question.introduction;
    case 1:
      return question.question1;
    case 2:
      return question.question2;
    case 3:
      return question.question3;
    case 4:
      return question.question4;
    default:
      throw new Error(`Unsupported speaking part index: ${partIndex}`);
  }
}

function speakingPartLabel(partIndex: number) {
  if (partIndex === 0) return "Introduction";
  return `Question ${partIndex}`;
}

function publicPathToDiskPath(publicPath: string) {
  if (!publicPath.startsWith("/uploads/")) {
    return null;
  }

  return path.join(uploadRoot, publicPath.replace(/^\/uploads\//, ""));
}

async function removeSpeakingPartArtifacts(part: { audioPath: string }) {
  const diskPath = publicPathToDiskPath(part.audioPath);
  if (diskPath) {
    await rm(diskPath, { force: true });
  }
}

async function saveSpeakingAudio(
  questionId: number,
  sessionId: number,
  partIndex: number,
  audioDataUrl: string,
) {
  const { mimeType, buffer } = decodeDataUrl(audioDataUrl);
  const ext = extensionForMime(mimeType);
  const dir = path.join(
    speakingUploadRoot,
    `question-${questionId}`,
    `session-${sessionId}`,
  );
  mkdirSync(dir, { recursive: true });

  const fileName = `part-${partIndex}-${randomUUID()}.${ext}`;
  const diskPath = path.join(dir, fileName);
  const publicPath = path.posix.join(
    "/uploads",
    "speaking",
    `question-${questionId}`,
    `session-${sessionId}`,
    fileName,
  );

  writeFileSync(diskPath, buffer);

  return {
    mimeType,
    diskPath,
    publicPath,
    buffer,
  };
}

async function persistSpeakingEvaluation(args: {
  partId: number;
  evaluation: Awaited<ReturnType<typeof evaluateSpeakingResponse>>;
}) {
  const { partId, evaluation } = args;

  await prisma.speakingErrorLog.deleteMany({ where: { partId } });

  if (evaluation.errors.length > 0) {
    await prisma.speakingErrorLog.createMany({
      data: evaluation.errors.map((error) => ({
        partId,
        errorType: error.type,
        incorrect: error.incorrect,
        suggestion: error.suggestion,
        explanation: error.explanation,
      })),
    });
  }
}

// --- Middleware ---

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN ?? "http://localhost:5173",
  }),
);
app.use(express.json({ limit: "25mb" }));
app.use("/uploads", express.static(uploadRoot));

app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    return requireApiKey(req, res, next);
  }
  next();
});

// --- Routes ---

app.get("/api/gemini-models", async (_req, res) => {
  res.json(getGeminiModelConfig());
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
      const generated = await generateQuestion(
        type as "Email" | "Academic",
        getRequestedGeminiModel(req),
      );
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
      getRequestedGeminiModel(req),
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

// --- Speaking Routes ---

app.get("/api/speaking/questions", async (_req, res) => {
  try {
    const questions = await prisma.speakingQuestion.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(questions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch speaking questions" });
  }
});

app.get("/api/speaking/questions/:id", async (req, res) => {
  const id = parseIdParam(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: "Invalid question id" });
  }

  try {
    const question = await prisma.speakingQuestion.findUnique({
      where: { id },
    });
    if (question) {
      res.json(question);
    } else {
      res.status(404).json({ error: "Speaking question not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch speaking question" });
  }
});

app.post("/api/speaking/questions", async (req, res) => {
  const {
    title,
    introduction,
    question1,
    question2,
    question3,
    question4,
    autoGenerate,
  } = req.body;

  try {
    let nextTitle = title;
    let nextIntroduction = introduction;
    let nextQuestion1 = question1;
    let nextQuestion2 = question2;
    let nextQuestion3 = question3;
    let nextQuestion4 = question4;

    if (autoGenerate) {
      const generated = await generateSpeakingQuestion(
        getRequestedGeminiModel(req),
      );
      nextTitle = generated.title;
      nextIntroduction = generated.introduction;
      nextQuestion1 = generated.question1;
      nextQuestion2 = generated.question2;
      nextQuestion3 = generated.question3;
      nextQuestion4 = generated.question4;
    }

    if (
      !ensureString(nextTitle) ||
      !ensureString(nextIntroduction) ||
      !ensureString(nextQuestion1) ||
      !ensureString(nextQuestion2) ||
      !ensureString(nextQuestion3) ||
      !ensureString(nextQuestion4)
    ) {
      return res.status(400).json({ error: "Missing speaking question fields" });
    }

    const speakingQuestion = await prisma.speakingQuestion.create({
      data: {
        title: nextTitle.trim(),
        introduction: nextIntroduction.trim(),
        question1: nextQuestion1.trim(),
        question2: nextQuestion2.trim(),
        question3: nextQuestion3.trim(),
        question4: nextQuestion4.trim(),
      },
    });

    res.json(speakingQuestion);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create speaking question" });
  }
});

app.delete("/api/speaking/questions/:id", async (req, res) => {
  const id = parseIdParam(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: "Invalid question id" });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.speakingErrorLog.deleteMany({
        where: { part: { session: { questionId: id } } },
      });
      await tx.speakingAttemptPart.deleteMany({
        where: { session: { questionId: id } },
      });
      await tx.speakingSession.deleteMany({ where: { questionId: id } });
      await tx.speakingQuestion.delete({ where: { id } });
    });

    await rm(path.join(speakingUploadRoot, `question-${id}`), {
      recursive: true,
      force: true,
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete speaking question" });
  }
});

app.get("/api/speaking/questions/:id/sessions", async (req, res) => {
  const questionId = parseIdParam(req.params.id);
  if (questionId === null) {
    return res.status(400).json({ error: "Invalid question id" });
  }

  try {
    const sessions = await prisma.speakingSession.findMany({
      where: { questionId },
      orderBy: { createdAt: "desc" },
      include: {
        parts: {
          orderBy: { partIndex: "asc" },
          include: {
            errorLogs: {
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    });
    res.json(sessions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch speaking sessions" });
  }
});

app.post("/api/speaking/questions/:id/sessions", async (req, res) => {
  const questionId = parseIdParam(req.params.id);
  if (questionId === null) {
    return res.status(400).json({ error: "Invalid question id" });
  }

  try {
    const question = await prisma.speakingQuestion.findUnique({
      where: { id: questionId },
    });
    if (!question) {
      return res.status(404).json({ error: "Speaking question not found" });
    }

    const session = await prisma.speakingSession.create({
      data: { questionId },
    });
    res.json(session);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create speaking session" });
  }
});

app.get("/api/speaking/sessions/:sessionId", async (req, res) => {
  const sessionId = parseIdParam(req.params.sessionId);
  if (sessionId === null) {
    return res.status(400).json({ error: "Invalid session id" });
  }

  try {
    const session = await prisma.speakingSession.findUnique({
      where: { id: sessionId },
      include: {
        question: true,
        parts: {
          orderBy: { partIndex: "asc" },
          include: { errorLogs: { orderBy: { createdAt: "asc" } } },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ error: "Speaking session not found" });
    }

    res.json(session);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch speaking session" });
  }
});

app.post("/api/speaking/sessions/:sessionId/parts", async (req, res) => {
  const sessionId = parseIdParam(req.params.sessionId);
  if (sessionId === null) {
    return res.status(400).json({ error: "Invalid session id" });
  }

  const { partIndex, audioDataUrl } = req.body;
  const audioPayload = typeof audioDataUrl === "string" ? audioDataUrl : "";

  if (
    typeof partIndex !== "number" ||
    partIndex < 1 ||
    partIndex > 4 ||
    !audioPayload.trim()
  ) {
    return res.status(400).json({ error: "Invalid speaking part payload" });
  }

  try {
    const session = await prisma.speakingSession.findUnique({
      where: { id: sessionId },
      include: { question: true },
    });

    if (!session) {
      return res.status(404).json({ error: "Speaking session not found" });
    }

    const audio = await saveSpeakingAudio(
      session.questionId,
      session.id,
      partIndex,
      audioPayload,
    );
    const prompt = speakingPromptForPart(session.question, partIndex);
    const transcriptResult = await transcribeSpeakingAudio(
      audio.buffer,
      audio.mimeType,
      getRequestedGeminiModel(req),
    );
    const evaluation = await evaluateSpeakingResponse(
      prompt,
      transcriptResult.transcript,
      getRequestedGeminiModel(req),
    );

    const existingPart = await prisma.speakingAttemptPart.findUnique({
      where: {
        sessionId_partIndex: {
          sessionId: session.id,
          partIndex,
        },
      },
    });

    const part = existingPart
      ? await prisma.speakingAttemptPart.update({
          where: { id: existingPart.id },
          data: {
            audioPath: audio.publicPath,
            audioMimeType: audio.mimeType || null,
            transcript: transcriptResult.transcript,
            score: evaluation.score,
            feedback: evaluation.feedback,
          },
        })
      : await prisma.speakingAttemptPart.create({
          data: {
            sessionId: session.id,
            partIndex,
            audioPath: audio.publicPath,
            audioMimeType: audio.mimeType || null,
            transcript: transcriptResult.transcript,
            score: evaluation.score,
            feedback: evaluation.feedback,
          },
        });

    await persistSpeakingEvaluation({ partId: part.id, evaluation });

    const refreshedPart = await prisma.speakingAttemptPart.findUnique({
      where: { id: part.id },
      include: {
        errorLogs: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    res.json({
      part: refreshedPart,
      transcript: transcriptResult.transcript,
      evaluation,
      audioUrl: audio.publicPath,
      partLabel: speakingPartLabel(partIndex),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to process speaking part" });
  }
});

app.delete("/api/speaking/parts/:id", async (req, res) => {
  const partId = parseIdParam(req.params.id);
  if (partId === null) {
    return res.status(400).json({ error: "Invalid part id" });
  }

  try {
    const part = await prisma.speakingAttemptPart.findUnique({
      where: { id: partId },
      include: {
        session: true,
        errorLogs: true,
      },
    });

    if (!part) {
      return res.status(404).json({ error: "Speaking part not found" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.speakingErrorLog.deleteMany({ where: { partId } });
      await tx.speakingAttemptPart.delete({ where: { id: partId } });
    });

    await removeSpeakingPartArtifacts(part);

    const remainingParts = await prisma.speakingAttemptPart.count({
      where: { sessionId: part.sessionId },
    });
    if (remainingParts === 0) {
      await prisma.speakingSession.delete({ where: { id: part.sessionId } });
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete speaking history item" });
  }
});

app.post("/api/speaking/parts/:id/re-evaluate", async (req, res) => {
  const partId = parseIdParam(req.params.id);
  if (partId === null) {
    return res.status(400).json({ error: "Invalid part id" });
  }

  try {
    const part = await prisma.speakingAttemptPart.findUnique({
      where: { id: partId },
      include: {
        session: { include: { question: true } },
      },
    });

    if (!part) {
      return res.status(404).json({ error: "Speaking part not found" });
    }

    const prompt = speakingPromptForPart(part.session.question, part.partIndex);
    const evaluation = await evaluateSpeakingResponse(
      prompt,
      part.transcript,
      getRequestedGeminiModel(req),
    );

    const updatedPart = await prisma.speakingAttemptPart.update({
      where: { id: partId },
      data: {
        score: evaluation.score,
        feedback: evaluation.feedback,
      },
    });

    await persistSpeakingEvaluation({ partId: updatedPart.id, evaluation });

    const refreshed = await prisma.speakingAttemptPart.findUnique({
      where: { id: updatedPart.id },
      include: { errorLogs: { orderBy: { createdAt: "asc" } } },
    });

    res.json({ part: refreshed, evaluation });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to re-evaluate speaking part" });
  }
});

app.get("/api/speaking/error-logs", async (_req, res) => {
  try {
    const logs = await prisma.speakingErrorLog.findMany({
      include: {
        part: {
          include: {
            session: {
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
    res.status(500).json({ error: "Failed to fetch speaking error logs" });
  }
});

app.patch("/api/speaking/error-logs/:id/important", async (req, res) => {
  const id = parseIdParam(req.params.id);
  const { important } = req.body;

  if (id === null || typeof important !== "boolean") {
    return res.status(400).json({ error: "Invalid important update payload" });
  }

  try {
    const log = await prisma.speakingErrorLog.update({
      where: { id },
      data: { important },
    });
    res.json(log);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Failed to update speaking error importance",
    });
  }
});

// --- Server Startup ---

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
