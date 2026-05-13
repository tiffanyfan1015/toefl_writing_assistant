import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { evaluateEssay, generateQuestion } from './services/gemini.js';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const port = parseInt(process.env.PORT || '3001');

app.use(cors());
app.use(express.json());

// Routes
app.get('/api/questions', async (req, res) => {
  const questions = await prisma.question.findMany({
    orderBy: { createdAt: 'desc' }
  });
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

app.post('/api/questions', async (req, res) => {
  const { type, title, content, autoGenerate } = req.body;

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
    res.status(500).json({ error: 'Failed to create question' });
  }
});

app.delete('/api/questions/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    // Delete related records first due to SQLite constraints if needed, 
    // but Prisma should handle it if defined or we do it manually.
    // In our schema, we don't have cascade delete defined explicitly in Prisma, 
    // so we should delete submissions and revisions first.
    
    await prisma.errorLog.deleteMany({ where: { submission: { questionId: id } } });
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
    where: { questionId: parseInt(req.params.id) },
    include: {
      revisions: {
        orderBy: { createdAt: 'desc' },
        include: { errorLogs: true }, // Added to show historical errors
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
    evaluation = await evaluateEssay(question.content, text);
  } catch (error) {
    console.error('Gemini Evaluation Failed:', error);
  }

  try {
    let submission = await prisma.submission.findFirst({
      where: { questionId },
    });

    const revisionData: any = {
      text,
      score: evaluation?.score || null,
      feedback: evaluation?.feedback || null,
    };

    if (evaluation) {
      revisionData.errorLogs = {
        create: evaluation.errors.map(err => ({
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
          latestScore: evaluation?.score || null,
          revisions: {
            create: revisionData,
          },
        },
        include: {
          revisions: { 
            orderBy: { createdAt: 'desc' },
            include: { errorLogs: true }
          },
        },
      });
    } else {
      submission = await prisma.submission.create({
        data: {
          question: { connect: { id: questionId } },
          currentText: text,
          latestScore: evaluation?.score || null,
          revisions: {
            create: revisionData,
          },
        },
        include: {
          revisions: { 
            orderBy: { createdAt: 'desc' },
            include: { errorLogs: true }
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
    orderBy: { createdAt: 'desc' }
  });
  res.json(logs);
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
});
