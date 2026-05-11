import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  console.log('--- DATABASE INSPECTION ---');

  const questions = await prisma.question.findMany();
  console.log(`\n[Questions] Total: ${questions.length}`);
  questions.forEach(q => {
    console.log(`- ID ${q.id}: ${q.title} (${q.type})`);
  });

  const submissions = await prisma.submission.findMany({
    include: {
      revisions: { orderBy: { createdAt: 'desc' } },
      errorLogs: true,
      question: true
    }
  });

  console.log(`\n[Submissions] Total: ${submissions.length}`);
  submissions.forEach(s => {
    console.log(`\nSubmission ID ${s.id} for Question: "${s.question.title}"`);
    console.log(`- Latest Score: ${s.latestScore || 'N/A'}`);
    console.log(`- Current Text Length: ${s.currentText.length} chars`);
    console.log(`- Revisions: ${s.revisions.length}`);
    console.log(`- Error Logs: ${s.errorLogs.length}`);
    
    if (s.revisions.length > 0) {
      console.log(`  - Latest Revision Time: ${s.revisions[0]?.createdAt.toLocaleString()}`);
    }
  });

  console.log('\n---------------------------');
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
