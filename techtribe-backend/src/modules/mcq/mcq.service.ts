import { DifficultyLevel } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';

export async function listCategories() {
  return prisma.mcqCategory.findMany({
    include: { _count: { select: { questions: true } } },
    orderBy: { name: 'asc' }
  });
}

export async function startAttempt(
  userId: string,
  input: { categorySlug?: string; difficulty?: DifficultyLevel; questionCount: number }
) {
  const where = {
    ...(input.categorySlug ? { category: { slug: input.categorySlug } } : {}),
    ...(input.difficulty ? { difficulty: input.difficulty } : {})
  };

  const pool = await prisma.mcqQuestion.findMany({ where, select: { id: true } });
  if (pool.length === 0) throw ApiError.notFound('No questions available for this category/difficulty yet');

  // Random sample without replacement
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const selectedIds = shuffled.slice(0, Math.min(input.questionCount, shuffled.length)).map((q) => q.id);

  const questions = await prisma.mcqQuestion.findMany({
    where: { id: { in: selectedIds } },
    select: { id: true, question: true, options: true, difficulty: true, category: { select: { name: true, slug: true } } }
  });

  const category = input.categorySlug
    ? await prisma.mcqCategory.findUnique({ where: { slug: input.categorySlug } })
    : null;

  const attempt = await prisma.mcqAttempt.create({
    data: {
      userId,
      categoryId: category?.id,
      difficulty: input.difficulty,
      totalCount: questions.length
    }
  });

  return { attemptId: attempt.id, questions };
}

export async function submitAnswer(userId: string, attemptId: string, questionId: string, selectedIndex: number) {
  const attempt = await prisma.mcqAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.userId !== userId) throw ApiError.notFound('Attempt not found');
  if (attempt.completedAt) throw ApiError.badRequest('This attempt has already been completed');

  const question = await prisma.mcqQuestion.findUnique({ where: { id: questionId } });
  if (!question) throw ApiError.notFound('Question not found');

  const isCorrect = question.correctIndex === selectedIndex;

  await prisma.mcqAttemptAnswer.upsert({
    where: { attemptId_questionId: { attemptId, questionId } },
    create: { attemptId, questionId, selectedIndex, isCorrect },
    update: { selectedIndex, isCorrect }
  });

  if (isCorrect) {
    await prisma.mcqAttempt.update({ where: { id: attemptId }, data: { score: { increment: 1 } } });
  }

  return { isCorrect, correctIndex: question.correctIndex, explanation: question.explanation };
}

export async function completeAttempt(userId: string, attemptId: string) {
  const attempt = await prisma.mcqAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.userId !== userId) throw ApiError.notFound('Attempt not found');
  if (attempt.completedAt) return attempt;

  const updated = await prisma.mcqAttempt.update({
    where: { id: attemptId },
    data: { completedAt: new Date() }
  });

  // Award XP: 10 per correct answer
  const xpGained = updated.score * 10;
  if (xpGained > 0) {
    await prisma.user.update({ where: { id: userId }, data: { xp: { increment: xpGained } } });
  }

  return { ...updated, xpGained };
}

export async function getAttemptHistory(userId: string) {
  return prisma.mcqAttempt.findMany({
    where: { userId, completedAt: { not: null } },
    orderBy: { completedAt: 'desc' },
    take: 50,
    include: { category: true }
  });
}
