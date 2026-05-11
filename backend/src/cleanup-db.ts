import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
  console.log('Cleaning up duplicate questions...');
  
  const allQuestions = await prisma.question.findMany();
  const seen = new Set();
  const toDelete = [];

  for (const q of allQuestions) {
    const key = `${q.type}-${q.title}`;
    if (seen.has(key)) {
      toDelete.push(q.id);
    } else {
      seen.add(key);
    }
  }

  if (toDelete.length > 0) {
    await prisma.question.deleteMany({
      where: { id: { in: toDelete } }
    });
    console.log(`Deleted ${toDelete.length} duplicate questions.`);
  } else {
    console.log('No duplicates found.');
  }
}

cleanup().finally(() => prisma.$disconnect());
