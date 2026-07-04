import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // eslint-disable-next-line no-console
  console.log('🌱 Seeding database...');

  // ---------- Admin user ----------
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@techtribe.dev';
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      username: adminUsername,
      passwordHash,
      displayName: 'TechTribe Admin',
      role: 'ADMIN',
      isEmailVerified: true
    },
    update: {}
  });

  // ---------- Languages ----------
  const languages = [
    {
      slug: 'javascript',
      name: 'JavaScript',
      version: 'ES2024',
      icon: '🟨',
      color: '#f7df1e',
      description: 'The language of the web — runs in every browser and, via Node.js, on servers too.',
      uses: 'Web apps, backend APIs, mobile apps (React Native), CLIs, automation.',
      tags: ['web', 'frontend', 'backend']
    },
    {
      slug: 'python',
      name: 'Python',
      version: '3.12',
      icon: '🐍',
      color: '#3776ab',
      description: 'A readable, general-purpose language beloved for data science, scripting, and backend development.',
      uses: 'Data science, ML/AI, web backends, scripting, automation.',
      tags: ['backend', 'data', 'ai']
    },
    {
      slug: 'typescript',
      name: 'TypeScript',
      version: '5.6',
      icon: '🔷',
      color: '#3178c6',
      description: 'A statically typed superset of JavaScript that compiles to plain JS.',
      uses: 'Large-scale web apps, Node.js backends, type-safe tooling.',
      tags: ['web', 'backend']
    }
  ];

  for (const lang of languages) {
    await prisma.language.upsert({
      where: { slug: lang.slug },
      create: {
        ...lang,
        sections: {
          create: [
            {
              key: 'hello',
              title: 'Hello, World!',
              codeHtml:
                lang.slug === 'python'
                  ? '<pre><code>print("Hello, World!")</code></pre>'
                  : '<pre><code>console.log("Hello, World!");</code></pre>',
              order: 0
            },
            {
              key: 'variables',
              title: 'Variables',
              codeHtml:
                lang.slug === 'python'
                  ? '<pre><code>name = "TechTribe"\nversion = 1</code></pre>'
                  : '<pre><code>const name = "TechTribe";\nlet version = 1;</code></pre>',
              order: 1
            }
          ]
        }
      },
      update: {}
    });
  }

  // ---------- MCQ categories + questions ----------
  const jsCategory = await prisma.mcqCategory.upsert({
    where: { slug: 'javascript' },
    create: { slug: 'javascript', name: 'JavaScript', description: 'Core JS concepts' },
    update: {}
  });

  const existingQuestions = await prisma.mcqQuestion.count({ where: { categoryId: jsCategory.id } });
  if (existingQuestions === 0) {
    await prisma.mcqQuestion.createMany({
      data: [
        {
          categoryId: jsCategory.id,
          question: 'What does `typeof null` return in JavaScript?',
          options: ['"null"', '"undefined"', '"object"', '"boolean"'],
          correctIndex: 2,
          explanation: 'This is a long-standing JavaScript quirk — `typeof null` returns "object".',
          difficulty: 'BEGINNER'
        },
        {
          categoryId: jsCategory.id,
          question: 'Which method creates a new array with all elements that pass a test?',
          options: ['map()', 'filter()', 'reduce()', 'forEach()'],
          correctIndex: 1,
          explanation: '`filter()` returns a new array containing only elements that satisfy the predicate.',
          difficulty: 'BEGINNER'
        },
        {
          categoryId: jsCategory.id,
          question: 'What is a closure?',
          options: [
            'A function bundled with references to its surrounding state',
            'A way to close a database connection',
            'A loop that never terminates',
            'A CSS layout technique'
          ],
          correctIndex: 0,
          explanation: 'Closures let inner functions access variables from their enclosing scope even after it has returned.',
          difficulty: 'INTERMEDIATE'
        }
      ]
    });
  }

  // ---------- Sample coding challenge ----------
  await prisma.challenge.upsert({
    where: { slug: 'two-sum' },
    create: {
      slug: 'two-sum',
      title: 'Two Sum',
      description:
        'Given an array of integers `nums` and an integer `target`, return the indices of the two numbers that add up to `target`. Assume exactly one solution exists.',
      difficulty: 'EASY',
      languageTags: ['javascript', 'python', 'typescript'],
      starterCode: 'function twoSum(nums, target) {\n  // your code here\n}',
      constraints: '2 <= nums.length <= 10^4',
      testCases: {
        create: [
          { input: 'nums=[2,7,11,15], target=9', expectedOutput: '[0,1]', isHidden: false, order: 0 },
          { input: 'nums=[3,2,4], target=6', expectedOutput: '[1,2]', isHidden: false, order: 1 },
          { input: 'nums=[3,3], target=6', expectedOutput: '[0,1]', isHidden: true, order: 2 }
        ]
      }
    },
    update: {}
  });

  // ---------- Sample roadmap template ----------
  await prisma.roadmap.upsert({
    where: { slug: 'become-a-frontend-developer' },
    create: {
      slug: 'become-a-frontend-developer',
      title: 'Become a Frontend Developer',
      goal: 'Frontend web development',
      level: 'BEGINNER',
      description: 'A structured 6-month path from HTML basics to building production React apps.',
      isTemplate: true,
      milestones: {
        create: [
          {
            order: 0,
            title: 'Month 1: HTML & CSS Foundations',
            content: 'Learn semantic HTML, CSS box model, flexbox, and grid.',
            resources: ['MDN Web Docs', 'CSS Tricks'],
            projectIdea: 'Build a personal portfolio landing page.'
          },
          {
            order: 1,
            title: 'Month 2: JavaScript Fundamentals',
            content: 'Variables, functions, DOM manipulation, events, async/await.',
            resources: ['Eloquent JavaScript', 'JavaScript.info'],
            projectIdea: 'Build an interactive to-do list app.'
          }
        ]
      }
    },
    update: {}
  });

  // eslint-disable-next-line no-console
  console.log('✅ Seed complete.');
  // eslint-disable-next-line no-console
  console.log(`   Admin login: ${adminEmail} / (password from ADMIN_PASSWORD env)`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
