import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.question.createMany({
    data: [
      {
        type: 'Email',
        title: 'New Policy for Remote Work',
        content: 'Your professor has sent an email regarding a new policy for remote work in the research lab. Respond to the email expressing your opinion and any concerns you might have.',
      },
      {
        type: 'Academic',
        title: 'Environmental Impact of Tourism',
        content: 'Discuss the environmental impact of international tourism. Some argue that it brings economic benefits, while others worry about the ecological damage. What is your position?',
      },
      {
        type: 'Email',
        title: 'Office Relocation Feedback',
        content: 'The company is planning to move its office to a new location. Write an email to your manager providing feedback on the potential impact on your team\'s productivity.',
      },
      {
        type: 'Academic',
        title: 'Importance of Space Exploration',
        content: 'Should governments continue to fund space exploration, or should those resources be redirected to pressing issues on Earth like poverty and climate change? Provide your perspective.',
      },
    ],
  });
  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
