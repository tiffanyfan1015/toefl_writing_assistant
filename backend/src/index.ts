import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { mkdirSync, writeFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  evaluateEssay,
  evaluateSpeakingResponse,
  generateQuestion,
  generateSpeakingQuestion,
  getGeminiModelConfig,
  resolveGeminiModel,
  transcribeSpeakingAudio,
} from './services/gemini.js';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const port = parseInt(process.env.PORT || '3001', 10);
const uploadRoot = path.resolve('uploads');
const speakingUploadRoot = path.join(uploadRoot, 'speaking');

mkdirSync(speakingUploadRoot, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use('/uploads', express.static(uploadRoot));

app.get('/api/gemini-models', async (req, res) => {
  res.json(getGeminiModelConfig());
});

function toPositiveInt(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function ensureString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function getRequestedGeminiModel(req: express.Request) {
  return resolveGeminiModel(req.header('x-gemini-model'));
}

function extensionForMime(mimeType: string) {
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'm4a';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('wav')) return 'wav';
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3';
  return 'webm';
}

function decodeDataUrl(dataUrl: string) {
  if (!dataUrl.startsWith('data:')) {
    throw new Error('Invalid audio payload');
  }

  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex === -1) {
    throw new Error('Invalid audio payload');
  }

  const header = dataUrl.slice(5, commaIndex);
  const base64 = dataUrl.slice(commaIndex + 1);
  if (!header || !base64) {
    throw new Error('Invalid audio payload');
  }

  const mimeType = header.split(';')[0];
  if (!mimeType) {
    throw new Error('Invalid audio payload');
  }

  return {
    mimeType,
    buffer: Buffer.from(base64, 'base64'),
  };
}

function speakingPromptForPart(question: {
  introduction: string;
  question1: string;
  question2: string;
  question3: string;
  question4: string;
}, partIndex: number) {
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
  if (partIndex === 0) return 'Introduction';
  return `Question ${partIndex}`;
}

function publicPathToDiskPath(publicPath: string) {
  if (!publicPath.startsWith('/uploads/')) {
    return null;
  }

  return path.join(uploadRoot, publicPath.replace(/^\/uploads\//, ''));
}

async function removeSpeakingPartArtifacts(part: {
  audioPath: string;
  id: number;
}) {
  const diskPath = publicPathToDiskPath(part.audioPath);
  if (diskPath) {
    await rm(diskPath, { force: true });
  }
}

async function saveSpeakingAudio(questionId: number, sessionId: number, partIndex: number, audioDataUrl: string) {
  const { mimeType, buffer } = decodeDataUrl(audioDataUrl);
  const ext = extensionForMime(mimeType);
  const dir = path.join(speakingUploadRoot, `question-${questionId}`, `session-${sessionId}`);
  mkdirSync(dir, { recursive: true });

  const fileName = `part-${partIndex}-${randomUUID()}.${ext}`;
  const diskPath = path.join(dir, fileName);
  const publicPath = path.posix.join(
    '/uploads',
    'speaking',
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

app.get('/api/questions', async (req, res) => {
  const questions = await prisma.question.findMany({
    orderBy: { createdAt: 'desc' },
  });
  res.json(questions);
});

app.get('/api/questions/:id', async (req, res) => {
  const question = await prisma.question.findUnique({
    where: { id: parsePositiveInt(req.params.id) },
  });
  if (question) {
    res.json(question);
  } else {
    res.status(404).json({ error: 'Question not found' });
  }
});

function parsePositiveInt(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? NaN : parsed;
}

app.post('/api/questions', async (req, res) => {
  const { type, title, content, autoGenerate } = req.body;

  try {
    let finalTitle = title;
    let finalContent = content;

    if (autoGenerate) {
      const generated = await generateQuestion(type, getRequestedGeminiModel(req));
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
      error: 'Failed to create question',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.delete('/api/questions/:id', async (req, res) => {
  const id = parsePositiveInt(req.params.id);
  try {
    await prisma.errorLog.deleteMany({ where: { revision: { submission: { questionId: id } } } });
    await prisma.submissionRevision.deleteMany({ where: { submission: { questionId: id } } });
    await prisma.submission.deleteMany({ where: { questionId: id } });
    await prisma.question.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

app.get('/api/questions/:id/latest-submission', async (req, res) => {
  const submission = await prisma.submission.findFirst({
    where: { questionId: parsePositiveInt(req.params.id) },
    include: {
      revisions: {
        orderBy: { createdAt: 'desc' },
        include: { errorLogs: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(submission);
});

app.post('/api/submissions', async (req, res) => {
  const { questionId, text } = req.body;

  const question = await prisma.question.findUnique({
    where: { id: questionId },
  });

  if (!question) {
    return res.status(404).json({ error: 'Question not found' });
  }

  let evaluation = null;
  try {
    evaluation = await evaluateEssay(question.type as 'Email' | 'Academic', question.content, text, getRequestedGeminiModel(req));
  } catch (error) {
    console.error('Gemini Evaluation Failed:', error);
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
            orderBy: { createdAt: 'desc' },
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
            orderBy: { createdAt: 'desc' },
            include: { errorLogs: true },
          },
        },
      });
    }

    res.json({ submission, evaluation });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process submission' });
  }
});

app.get('/api/error-logs', async (req, res) => {
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
    orderBy: { createdAt: 'desc' },
  });
  res.json(logs);
});

app.patch('/api/error-logs/:id/important', async (req, res) => {
  const id = parsePositiveInt(req.params.id);
  const { important } = req.body;

  if (Number.isNaN(id) || typeof important !== 'boolean') {
    return res.status(400).json({ error: 'Invalid important update payload' });
  }

  try {
    const log = await prisma.errorLog.update({
      where: { id },
      data: { important },
    });
    res.json(log);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update error importance' });
  }
});

app.get('/api/speaking/questions', async (req, res) => {
  const questions = await prisma.speakingQuestion.findMany({
    orderBy: { createdAt: 'desc' },
  });
  res.json(questions);
});

app.get('/api/speaking/questions/:id', async (req, res) => {
  const question = await prisma.speakingQuestion.findUnique({
    where: { id: parsePositiveInt(req.params.id) },
  });

  if (!question) {
    return res.status(404).json({ error: 'Speaking question not found' });
  }

  res.json(question);
});

app.post('/api/speaking/questions', async (req, res) => {
  const { title, introduction, question1, question2, question3, question4, autoGenerate } = req.body;

  try {
    let nextTitle = title;
    let nextIntroduction = introduction;
    let nextQuestion1 = question1;
    let nextQuestion2 = question2;
    let nextQuestion3 = question3;
    let nextQuestion4 = question4;

    if (autoGenerate) {
      const generated = await generateSpeakingQuestion(getRequestedGeminiModel(req));
      nextTitle = generated.title;
      nextIntroduction = generated.introduction;
      nextQuestion1 = generated.question1;
      nextQuestion2 = generated.question2;
      nextQuestion3 = generated.question3;
      nextQuestion4 = generated.question4;
    }

    if (!ensureString(nextTitle) || !ensureString(nextIntroduction) || !ensureString(nextQuestion1) || !ensureString(nextQuestion2) || !ensureString(nextQuestion3) || !ensureString(nextQuestion4)) {
      return res.status(400).json({ error: 'Missing speaking question fields' });
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
    res.status(500).json({
      error: 'Failed to create speaking question',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.delete('/api/speaking/questions/:id', async (req, res) => {
  const id = parsePositiveInt(req.params.id);

  try {
    await prisma.speakingErrorLog.deleteMany({
      where: { part: { session: { questionId: id } } },
    });
    await prisma.speakingAttemptPart.deleteMany({
      where: { session: { questionId: id } },
    });
    await prisma.speakingSession.deleteMany({ where: { questionId: id } });
    await prisma.speakingQuestion.delete({ where: { id } });
    await rm(path.join(speakingUploadRoot, `question-${id}`), { recursive: true, force: true });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete speaking question' });
  }
});

app.get('/api/speaking/questions/:id/sessions', async (req, res) => {
  const questionId = parsePositiveInt(req.params.id);

  const sessions = await prisma.speakingSession.findMany({
    where: { questionId },
    orderBy: { createdAt: 'desc' },
    include: {
      parts: {
        orderBy: { partIndex: 'asc' },
        include: {
          errorLogs: {
            orderBy: { createdAt: 'asc' },
          },
        },
      },
    },
  });

  res.json(sessions);
});

app.post('/api/speaking/questions/:id/sessions', async (req, res) => {
  const questionId = parsePositiveInt(req.params.id);
  const question = await prisma.speakingQuestion.findUnique({ where: { id: questionId } });

  if (!question) {
    return res.status(404).json({ error: 'Speaking question not found' });
  }

  const session = await prisma.speakingSession.create({
    data: {
      questionId,
    },
  });

  res.json(session);
});

app.get('/api/speaking/sessions/:sessionId', async (req, res) => {
  const sessionId = parsePositiveInt(req.params.sessionId);

  const session = await prisma.speakingSession.findUnique({
    where: { id: sessionId },
    include: {
      question: true,
      parts: {
        orderBy: { partIndex: 'asc' },
        include: { errorLogs: { orderBy: { createdAt: 'asc' } } },
      },
    },
  });

  if (!session) {
    return res.status(404).json({ error: 'Speaking session not found' });
  }

  res.json(session);
});

app.post('/api/speaking/sessions/:sessionId/parts', async (req, res) => {
  const sessionId = parsePositiveInt(req.params.sessionId);
  const { partIndex, audioDataUrl } = req.body;
  const audioPayload = typeof audioDataUrl === 'string' ? audioDataUrl : '';

  if (typeof partIndex !== 'number' || partIndex < 1 || partIndex > 4 || !audioPayload.trim()) {
    return res.status(400).json({ error: 'Invalid speaking part payload' });
  }

  const session = await prisma.speakingSession.findUnique({
    where: { id: sessionId },
    include: { question: true },
  });

  if (!session) {
    return res.status(404).json({ error: 'Speaking session not found' });
  }

  try {
    const audio = await saveSpeakingAudio(session.questionId, session.id, partIndex, audioPayload);
    const prompt = speakingPromptForPart(session.question, partIndex);
    const transcriptResult = await transcribeSpeakingAudio(audio.buffer, audio.mimeType, getRequestedGeminiModel(req));
    const evaluation = await evaluateSpeakingResponse(prompt, transcriptResult.transcript, getRequestedGeminiModel(req));

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
          orderBy: { createdAt: 'asc' },
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
    res.status(500).json({
      error: 'Failed to process speaking part',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.delete('/api/speaking/parts/:id', async (req, res) => {
  const partId = parsePositiveInt(req.params.id);

  const part = await prisma.speakingAttemptPart.findUnique({
    where: { id: partId },
    include: {
      session: true,
      errorLogs: true,
    },
  });

  if (!part) {
    return res.status(404).json({ error: 'Speaking part not found' });
  }

  try {
    await prisma.speakingErrorLog.deleteMany({ where: { partId } });
    await prisma.speakingAttemptPart.delete({ where: { id: partId } });
    await removeSpeakingPartArtifacts(part);

    const remainingParts = await prisma.speakingAttemptPart.count({ where: { sessionId: part.sessionId } });
    if (remainingParts === 0) {
      await prisma.speakingSession.delete({ where: { id: part.sessionId } });
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete speaking history item' });
  }
});

app.post('/api/speaking/parts/:id/re-evaluate', async (req, res) => {
  const partId = parsePositiveInt(req.params.id);
  const part = await prisma.speakingAttemptPart.findUnique({
    where: { id: partId },
    include: {
      session: { include: { question: true } },
    },
  });

  if (!part) {
    return res.status(404).json({ error: 'Speaking part not found' });
  }

  try {
    const prompt = speakingPromptForPart(part.session.question, part.partIndex);
    const evaluation = await evaluateSpeakingResponse(prompt, part.transcript, getRequestedGeminiModel(req));

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
      include: { errorLogs: { orderBy: { createdAt: 'asc' } } },
    });

    res.json({ part: refreshed, evaluation });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to re-evaluate speaking part' });
  }
});

app.get('/api/speaking/error-logs', async (req, res) => {
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
    orderBy: { createdAt: 'desc' },
  });
  res.json(logs);
});

app.patch('/api/speaking/error-logs/:id/important', async (req, res) => {
  const id = parsePositiveInt(req.params.id);
  const { important } = req.body;

  if (Number.isNaN(id) || typeof important !== 'boolean') {
    return res.status(400).json({ error: 'Invalid important update payload' });
  }

  try {
    const log = await prisma.speakingErrorLog.update({
      where: { id },
      data: { important },
    });
    res.json(log);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update speaking error importance' });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
});
