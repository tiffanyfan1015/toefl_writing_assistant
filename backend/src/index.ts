import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { evaluateEssay } from './services/gemini.js';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.get('/api/questions', async (req, res) => {
  const questions = await prisma.question.findMany();
  res.json(questions);
});

app.get('/api/questions/:id', async (req, res) => {
  const question = await prisma.question.findUnique({
    where: { id: parseInt(req.params.id) },
  });
  if (question) {
    res.json(question);
  } else {
    res.status(404).json({ error: 'Question not found' });
  }
});

app.post('/api/submissions', async (req, res) => {
  const { questionId, text } = req.body;

  const question = await prisma.question.findUnique({
    where: { id: questionId },
  });

  if (!question) {
    return res.status(404).json({ error: 'Question not found' });
  }

  try {
    const evaluation = await evaluateEssay(question.content, text);

    const submission = await prisma.submission.create({
      data: {
        questionId,
        currentText: text,
        latestScore: evaluation.score,
        revisions: {
          create: {
            text,
            score: evaluation.score,
          },
        },
        errorLogs: {
          create: evaluation.errors.map(err => ({
            errorType: err.type,
            incorrect: err.incorrect,
            suggestion: err.suggestion,
            explanation: err.explanation,
          })),
        },
      },
      include: {
        revisions: true,
        errorLogs: true,
      },
    });

    res.json({ submission, evaluation });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process submission' });
  }
});

app.get('/api/error-logs', async (req, res) => {
  const logs = await prisma.errorLog.findMany({
    include: {
      submission: {
        include: {
          question: true,
        },
      },
    },
  });
  res.json(logs);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
