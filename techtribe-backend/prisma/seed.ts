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
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      username: adminUsername,
      passwordHash,
      displayName: 'TechTribe Team',
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

  // ---------- Community posts (official launch content) ----------
  // Authored by the TechTribe Team account, not fake user personas — these
  // are real, useful posts to greet the first users, not simulated engagement.
  const seedPosts = [
    {
      id: 'seed-post-welcome',
      title: "Welcome to TechTribe — you're one of the first here 👋",
      body:
        "We just opened the doors. There's no history to catch up on and no crowd to feel lost in — whatever you post this week is genuinely one of the first things this community will see.\n\n" +
        "A few ways to jump in:\n" +
        "• Introduce yourself and what you're learning or building right now\n" +
        "• Ask a question you've been stuck on — someone here has probably hit it too\n" +
        "• Share a project, even a small or unfinished one\n\n" +
        "Early communities are built by whoever shows up first. That's you. Welcome aboard.",
      tags: ['General'],
      isPinned: true
    },
    {
      id: 'seed-post-python-perf',
      title: '5 Python performance habits that actually make a difference',
      body:
        "Picked these up over the years — none of them are exotic, they just quietly add up:\n\n" +
        "1. Use list comprehensions over manual append loops where reasonable — they're faster and usually more readable.\n" +
        "2. For membership checks, use a set or dict, not a list. `in` on a list is O(n); on a set it's O(1).\n" +
        "3. Avoid string concatenation with += in a loop — it's O(n²) because strings are immutable. Use `''.join(parts)` instead.\n" +
        "4. `__slots__` on classes with many instances can meaningfully cut memory overhead by skipping the per-instance `__dict__`.\n" +
        "5. Before optimizing anything, profile it. `cProfile` + `snakeviz` will tell you where the real time is going — usually somewhere you didn't expect.\n\n" +
        "What's a Python performance habit you picked up the hard way?",
      tags: ['Python']
    },
    {
      id: 'seed-post-structuredclone',
      title: 'structuredClone() quietly replaced JSON.parse(JSON.stringify()) for deep cloning',
      body:
        "If you've been using `JSON.parse(JSON.stringify(obj))` as a deep-clone hack, it's worth switching to the native `structuredClone()` — it's been supported in all major browsers and Node since v17.\n\n" +
        "Why it's better:\n" +
        "• Correctly clones Dates, Maps, Sets, RegExp, and typed arrays (the JSON trick silently mangles or drops these)\n" +
        "• Handles circular references without throwing\n" +
        "• No risk of losing `undefined` values or functions turning into missing keys unexpectedly\n\n" +
        "It won't clone functions or DOM nodes (by design), but for plain data it's strictly better than the JSON round-trip.",
      tags: ['JavaScript']
    },
    {
      id: 'seed-post-prompting',
      title: "Prompt engineering isn't dead, it just got quieter",
      body:
        "There was a wave of \"prompt engineering is obsolete now that models are smarter\" takes. In practice, the habits still matter — they just show up as smaller, less dramatic gains:\n\n" +
        "• Being explicit about the output format still reduces back-and-forth\n" +
        "• Giving one good example still steers style more reliably than describing it in words\n" +
        "• Breaking a big ask into steps still produces more consistent results than one giant prompt\n\n" +
        "The skill didn't disappear, it just stopped being the whole game. Curious what habits people here still find worth keeping.",
      tags: ['AI']
    },
    {
      id: 'seed-post-container-queries',
      title: 'Container queries finally make truly responsive components possible',
      body:
        "Media queries respond to the viewport. Container queries respond to the *component's own container* — which is what most of us actually wanted responsive design to do all along.\n\n" +
        "Example: a card component that switches to a compact layout when it's placed in a narrow sidebar, and a full layout in a wide main column — regardless of the overall screen size. That was awkward or impossible with media queries alone.\n\n" +
        "Browser support is solid now across Chrome, Firefox, and Safari. If you haven't tried `@container` yet, it's worth an afternoon.",
      tags: ['WebDevelopment']
    },
    {
      id: 'seed-post-interview',
      title: 'What I wish I knew before my first technical interview',
      body:
        "A few things that would've saved me a lot of unnecessary stress:\n\n" +
        "• Thinking out loud is expected, not a sign of weakness — interviewers usually care more about your approach than a silent correct answer\n" +
        "• \"I don't know, but here's how I'd find out\" is a completely fine answer to an unfamiliar question\n" +
        "• Asking clarifying questions before coding isn't stalling, it's what a real engineer would do\n" +
        "• Practice explaining tradeoffs out loud, not just solving problems silently — that's often what's actually being evaluated\n\n" +
        "What's one thing you'd tell yourself before your first interview?",
      tags: ['CareerAdvice']
    },
    {
      id: 'seed-post-opensource',
      title: "Your first open source contribution doesn't have to be code",
      body:
        "A lot of people wait to contribute to open source until they feel \"good enough\" to write code for a real project. You don't need to wait.\n\n" +
        "Just as valuable, and often more welcome from a first-time contributor:\n" +
        "• Improving unclear documentation\n" +
        "• Triaging issues — reproducing bugs, adding missing details\n" +
        "• Adding tests for uncovered edge cases\n" +
        "• Answering questions in the project's discussions/issues\n\n" +
        "Maintainers genuinely appreciate this work, and it's a low-pressure way to learn a codebase before touching its core logic.",
      tags: ['OpenSource']
    },
    {
      id: 'seed-post-type-hints',
      title: "Type hints won't make Python faster, but they'll save your future self a headache",
      body:
        "Python's type hints don't do anything at runtime by default — they're not a performance feature. Where they actually pay off is everything around the code:\n\n" +
        "• Your editor catches a wrong argument type before you even run the code\n" +
        "• Refactoring a function signature immediately flags every call site that needs updating\n" +
        "• Six months later, you don't have to re-read the whole function body to remember what it returns\n\n" +
        "You don't have to type-hint everything at once — adding them gradually to the functions you touch most is usually the realistic way in. Tools like `mypy` or `pyright` can then actually enforce them if you want.",
      tags: ['Python']
    },
    {
      id: 'seed-post-fstring-debug',
      title: "f-strings can do more than you think: f'{value=}' for quick debugging",
      body:
        "Small one, but it's saved me a lot of typing. Since Python 3.8, you can add `=` inside an f-string to print both the expression and its value:\n\n" +
        "`print(f'{user_id=}')` outputs `user_id=42` — no need to write `print(f'user_id={user_id}')` by hand.\n\n" +
        "Works with actual expressions too, not just variable names: `f'{a + b=}'` prints `a + b=7`. Great for quick print-debugging you're going to delete in 30 seconds anyway.",
      tags: ['Python']
    },
    {
      id: 'seed-post-optional-chaining',
      title: 'Optional chaining + nullish coalescing quietly killed a lot of defensive if-checks',
      body:
        "It's easy to forget how much boilerplate `?.` and `??` actually removed. Compare:\n\n" +
        "Before: `const city = user && user.address && user.address.city ? user.address.city : 'Unknown';`\n\n" +
        "Now: `const city = user?.address?.city ?? 'Unknown';`\n\n" +
        "The key difference between `??` and `||` that trips people up: `??` only falls back on `null`/`undefined`, while `||` also falls back on `0`, `''`, and `false`. If you've ever had a bug where a valid `0` value got silently replaced by a default, that's almost always a `||` where you needed `??`.",
      tags: ['JavaScript']
    },
    {
      id: 'seed-post-array-at',
      title: 'Array.prototype.at(-1) is the readable way to grab the last element',
      body:
        "Small quality-of-life addition to JS: `arr[arr.length - 1]` can now just be `arr.at(-1)`.\n\n" +
        "`.at()` accepts negative indices to count from the end, so `arr.at(-2)` gets the second-to-last item too. It works on strings as well. Doesn't replace normal bracket indexing for positive indices, but for \"give me the last item\" it's a lot easier to read at a glance.",
      tags: ['JavaScript']
    },
    {
      id: 'seed-post-finetuning-vs-rag',
      title: 'Fine-tuning vs. RAG, explained without the buzzwords',
      body:
        "This comes up constantly and the two get conflated a lot, so here's the plain-English version:\n\n" +
        "**Fine-tuning** changes the model's actual weights by training it further on your examples. Good for teaching a consistent *style*, *format*, or *behavior*. Not a good way to give it new factual knowledge — it tends to memorize unevenly and go stale the moment your data changes.\n\n" +
        "**RAG (retrieval-augmented generation)** doesn't touch the model at all — it fetches relevant documents at request time and stuffs them into the prompt as context. Good for keeping answers grounded in current, specific, or private information. The model is only as good as what gets retrieved, though.\n\n" +
        "Rule of thumb: RAG for *knowledge*, fine-tuning for *behavior*. Most real systems that need both end up using both.",
      tags: ['AI']
    },
    {
      id: 'seed-post-has-selector',
      title: "The CSS :has() selector means we finally don't need JS for some parent-based styling",
      body:
        "This one flew under the radar for a lot of people. `:has()` lets you style a parent based on what's *inside* it — something CSS genuinely couldn't do before.\n\n" +
        "Example: `.card:has(img) { padding: 0; }` — style a card differently only if it contains an image, no JS class-toggling required.\n\n" +
        "Another common use: `label:has(input:checked) { background: #eef; }` to highlight a label when its checkbox is checked. Support is solid across current Chrome, Safari, and Firefox now — worth revisiting anywhere you reached for JS just to add a class based on children.",
      tags: ['WebDevelopment']
    },
    {
      id: 'seed-post-reading-code',
      title: "Nobody tells you this, but reading other people's code is a skill you have to practice separately",
      body:
        "Writing code and reading code feel like they should be the same skill. They're not, and school/tutorials almost never train the second one.\n\n" +
        "Some things that actually helped me get better at it:\n" +
        "• Pick a mid-size open source repo you use and just read through one module end to end, no goal, just to see how someone else structured it\n" +
        "• When reviewing a PR, try to predict what a function does from its name/signature before opening the body — see how often you're right\n" +
        "• Get comfortable *not* understanding everything on the first pass — professionals skim first, then zoom into the part that matters\n\n" +
        "This matters more than it gets credit for — most day-to-day engineering work is reading existing code, not writing new code from scratch.",
      tags: ['CareerAdvice']
    },
    {
      id: 'seed-post-good-first-issue',
      title: "A quick way to find beginner-friendly open source issues across all of GitHub",
      body:
        "If you're looking for a first open source contribution and don't already have a project in mind, GitHub's own label search works surprisingly well:\n\n" +
        "Search `is:open is:issue label:\"good first issue\"` combined with a language filter (`language:python`, `language:typescript`, etc.) to narrow it down to something you're comfortable with.\n\n" +
        "A tip that matters more than the search itself: check when the label was added and whether anyone's already commented \"I'll take this\" — a lot of good-first-issue labels are stale or already claimed. Recently-updated issues on active repos are a much better use of your time than the first result.",
      tags: ['OpenSource']
    },
    {
      id: 'seed-post-cant-code-without',
      title: "What's one tool or extension you genuinely can't code without anymore?",
      body:
        "Not asking about the big obvious stuff like your editor or Git — more like the small, easy-to-forget-you're-using-it tool that quietly saves you time every single day.\n\n" +
        "I'll start: a clipboard history manager. Sounds trivial until you don't have one anymore and realize how often you copy something new before you'd finished using the last thing you copied.\n\n" +
        "What's yours?",
      tags: ['General']
    }
  ];

  for (const post of seedPosts) {
    await prisma.communityPost.upsert({
      where: { id: post.id },
      create: {
        id: post.id,
        authorId: adminUser.id,
        title: post.title,
        body: post.body,
        tags: post.tags,
        isPinned: post.isPinned || false
      },
      update: {}
    });
  }

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
