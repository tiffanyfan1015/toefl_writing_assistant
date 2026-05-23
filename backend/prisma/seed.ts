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
    ],
  });

  await prisma.speakingQuestion.createMany({
    data: [
      {
        title: 'Remote Work and Productivity',
        introduction: 'You have agreed to take part in a research study about remote work. You will have a short online interview with a researcher. The researcher will ask you some questions.',
        question1: 'Think back to the last time you worked from somewhere other than your regular workplace. Why did you choose that location, and what did you like about it?',
        question2: 'Some people find remote work freeing, while others feel distracted or lonely. How do you usually react to remote work, and why?',
        question3: 'Do you think remote workers usually have a better work-life balance? Why or why not?',
        question4: 'Some researchers believe companies should invest more in virtual social events to help remote teams feel connected. Do you agree? Why or why not?',
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
