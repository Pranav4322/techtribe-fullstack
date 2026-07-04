import { ChallengeDifficulty } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';
import { parsePagination, buildPaginatedResult } from '../../utils/pagination';
import { callClaude } from '../ai/anthropic.client';

export async function listChallenges(query: { page?: string; limit?: string; difficulty?: string; tag?: string }) {
  const pagination = parsePagination(query);
  const where = {
    isPublished: true,
    ...(query.difficulty ? { difficulty: query.difficulty as ChallengeDifficulty } : {}),
    ...(query.tag ? { languageTags: { has: query.tag } } : {})
  };

  const [items, total] = await Promise.all([
    prisma.challenge.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.take,
      select: {
        id: true,
        slug: true,
        title: true,
        difficulty: true,
        languageTags: true,
        createdAt: true,
        _count: { select: { submissions: true } }
      }
    }),
    prisma.challenge.count({ where })
  ]);

  return buildPaginatedResult(items, total, pagination);
}

export async function getChallenge(slug: string, userId?: string) {
  const challenge = await prisma.challenge.findUnique({
    where: { slug },
    include: { testCases: { where: { isHidden: false }, orderBy: { order: 'asc' } } }
  });
  if (!challenge || !challenge.isPublished) throw ApiError.notFound('Challenge not found');

  const bestSubmission = userId
    ? await prisma.challengeSubmission.findFirst({
        where: { challengeId: challenge.id, userId, status: 'ACCEPTED' },
        orderBy: { submittedAt: 'desc' }
      })
    : null;

  return { ...challenge, isSolved: Boolean(bestSubmission) };
}

export async function createChallenge(data: {
  slug: string;
  title: string;
  description: string;
  difficulty: ChallengeDifficulty;
  languageTags: string[];
  starterCode?: string;
  constraints?: string;
  testCases: { input: string; expectedOutput: string; isHidden: boolean }[];
}) {
  const { testCases, ...challengeData } = data;
  return prisma.challenge.create({
    data: {
      ...challengeData,
      testCases: { create: testCases.map((tc: { input: string; expectedOutput: string; isHidden: boolean }, i: number) => ({ ...tc, order: i })) }
    },
    include: { testCases: true }
  });
}

export async function deleteChallenge(slug: string) {
  const challenge = await prisma.challenge.findUnique({ where: { slug } });
  if (!challenge) throw ApiError.notFound('Challenge not found');
  await prisma.challenge.delete({ where: { slug } });
}

export async function submitSolution(userId: string, slug: string, code: string, language: string) {
  const challenge = await prisma.challenge.findUnique({
    where: { slug },
    include: { testCases: { orderBy: { order: 'asc' } } }
  });
  if (!challenge || !challenge.isPublished) throw ApiError.notFound('Challenge not found');

  // AI-assisted grading against the declared test cases (including hidden ones).
  const testCaseBlock = challenge.testCases
    .map((tc: { input: string; expectedOutput: string }, i: number) => `Test ${i + 1}\nInput: ${tc.input}\nExpected Output: ${tc.expectedOutput}`)
    .join('\n\n');

  const prompt = `You are grading a coding challenge submission. Challenge: "${challenge.title}".
Description: ${challenge.description}
${challenge.constraints ? `Constraints: ${challenge.constraints}` : ''}

Test cases:
${testCaseBlock}

Candidate's ${language} solution:
\`\`\`${language}
${code}
\`\`\`

Mentally trace the code against EVERY test case. Respond ONLY with valid JSON, no markdown fences: {"passedCount": <number>, "totalCount": ${challenge.testCases.length}, "allPassed": <true|false>, "feedback": "<concise senior-dev feedback: correctness per test, edge cases missed, complexity, style>"}`;

  const raw = await callClaude(prompt, 1200);
  let passedCount = 0;
  let feedback = raw;
  let allPassed = false;
  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    passedCount = parsed.passedCount ?? 0;
    allPassed = Boolean(parsed.allPassed);
    feedback = parsed.feedback ?? raw;
  } catch {
    // Fall back to raw text feedback with a conservative status if parsing fails
    allPassed = false;
  }

  const submission = await prisma.challengeSubmission.create({
    data: {
      userId,
      challengeId: challenge.id,
      code,
      language,
      status: allPassed ? 'ACCEPTED' : 'WRONG_ANSWER',
      aiFeedback: feedback,
      passedTests: passedCount,
      totalTests: challenge.testCases.length
    }
  });

  if (allPassed) {
    // Award XP only on first-ever acceptance for this challenge by this user
    const priorAccepted = await prisma.challengeSubmission.count({
      where: { userId, challengeId: challenge.id, status: 'ACCEPTED', id: { not: submission.id } }
    });
    if (priorAccepted === 0) {
      const xpMap: Record<ChallengeDifficulty, number> = { EASY: 15, MEDIUM: 30, HARD: 50 };
      await prisma.user.update({ where: { id: userId }, data: { xp: { increment: xpMap[challenge.difficulty] } } });
    }
  }

  return submission;
}

export async function listMySubmissions(userId: string, slug: string) {
  const challenge = await prisma.challenge.findUnique({ where: { slug } });
  if (!challenge) throw ApiError.notFound('Challenge not found');
  return prisma.challengeSubmission.findMany({
    where: { userId, challengeId: challenge.id },
    orderBy: { submittedAt: 'desc' }
  });
}

export async function toggleBookmark(userId: string, slug: string) {
  const challenge = await prisma.challenge.findUnique({ where: { slug } });
  if (!challenge) throw ApiError.notFound('Challenge not found');
  const existing = await prisma.bookmark.findUnique({
    where: { userId_challengeId: { userId, challengeId: challenge.id } }
  });
  if (existing) {
    await prisma.bookmark.delete({ where: { id: existing.id } });
    return { bookmarked: false };
  }
  await prisma.bookmark.create({ data: { userId, challengeId: challenge.id, contentType: 'CHALLENGE' } });
  return { bookmarked: true };
}
