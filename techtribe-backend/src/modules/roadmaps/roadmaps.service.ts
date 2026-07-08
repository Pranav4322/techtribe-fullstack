import { DifficultyLevel } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';
import { callAI } from '../ai/groq.client';
import { notifyUser } from '../notifications/notifications.service';

export async function listRoadmaps(query: { level?: string }) {
  return prisma.roadmap.findMany({
    where: { isTemplate: true, ...(query.level ? { level: query.level as DifficultyLevel } : {}) },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { milestones: true, progress: true } } }
  });
}

export async function getRoadmap(slug: string, userId?: string) {
  const roadmap = await prisma.roadmap.findUnique({
    where: { slug },
    include: { milestones: { orderBy: { order: 'asc' } } }
  });
  if (!roadmap) throw ApiError.notFound('Roadmap not found');

  let progress = null;
  if (userId) {
    progress = await prisma.userRoadmapProgress.findUnique({
      where: { userId_roadmapId: { userId, roadmapId: roadmap.id } },
      include: { milestoneProgress: true }
    });
  }

  return { ...roadmap, progress };
}

export async function createRoadmap(
  createdById: string,
  data: {
    slug: string;
    title: string;
    goal: string;
    level: DifficultyLevel;
    description: string;
    milestones: { title: string; content: string; resources: string[]; projectIdea?: string }[];
  }
) {
  const { milestones, ...roadmapData } = data;
  return prisma.roadmap.create({
    data: {
      ...roadmapData,
      createdById,
      isTemplate: true,
      milestones: { create: milestones.map((m, i) => ({ ...m, order: i })) }
    },
    include: { milestones: true }
  });
}

/** Uses Claude to draft a personalized roadmap, then persists it as a private (non-template) roadmap for the user. */
export async function generateRoadmap(userId: string, goal: string, level: string) {
  const prompt = `Create a structured 6-month learning roadmap as JSON only (no markdown fences, no extra text). Goal: ${goal}. Level: ${level}.
Format: {"title":"...","milestones":[{"title":"Month 1: ...","content":"what to learn this month, 2-4 sentences","resources":["resource 1","resource 2"],"projectIdea":"a mini project to build"}]}
Include exactly 6 milestones, one per month.`;

  const raw = await callAI(prompt, 1800);
  let parsed: { title: string; milestones: { title: string; content: string; resources: string[]; projectIdea?: string }[] };
  try {
    parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch {
    throw ApiError.internal('AI returned an unexpected roadmap format. Please try again.');
  }

  const slug = `${goal.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${userId.slice(0, 8)}-${Date.now()}`;
  const roadmap = await prisma.roadmap.create({
    data: {
      slug,
      title: parsed.title || `Roadmap: ${goal}`,
      goal,
      level: level as DifficultyLevel,
      description: `AI-generated personalized roadmap for: ${goal}`,
      isTemplate: false,
      createdById: userId,
      milestones: {
        create: (parsed.milestones || []).map((m, i) => ({
          order: i,
          title: m.title,
          content: m.content,
          resources: m.resources || [],
          projectIdea: m.projectIdea
        }))
      }
    },
    include: { milestones: { orderBy: { order: 'asc' } } }
  });

  await prisma.userRoadmapProgress.create({ data: { userId, roadmapId: roadmap.id } });

  return roadmap;
}

export async function startRoadmap(userId: string, slug: string) {
  const roadmap = await prisma.roadmap.findUnique({ where: { slug } });
  if (!roadmap) throw ApiError.notFound('Roadmap not found');

  return prisma.userRoadmapProgress.upsert({
    where: { userId_roadmapId: { userId, roadmapId: roadmap.id } },
    create: { userId, roadmapId: roadmap.id },
    update: {}
  });
}

export async function toggleMilestone(userId: string, slug: string, milestoneId: string) {
  const roadmap = await prisma.roadmap.findUnique({ where: { slug }, include: { milestones: true } });
  if (!roadmap) throw ApiError.notFound('Roadmap not found');

  const progress = await prisma.userRoadmapProgress.upsert({
    where: { userId_roadmapId: { userId, roadmapId: roadmap.id } },
    create: { userId, roadmapId: roadmap.id },
    update: {}
  });

  const milestone = roadmap.milestones.find((m: { id: string }) => m.id === milestoneId);
  if (!milestone) throw ApiError.notFound('Milestone not found');

  const existing = await prisma.userMilestoneProgress.findUnique({
    where: { userProgressId_milestoneId: { userProgressId: progress.id, milestoneId } }
  });

  const isComplete = !existing?.isComplete;
  await prisma.userMilestoneProgress.upsert({
    where: { userProgressId_milestoneId: { userProgressId: progress.id, milestoneId } },
    create: { userProgressId: progress.id, milestoneId, isComplete, completedAt: isComplete ? new Date() : null },
    update: { isComplete, completedAt: isComplete ? new Date() : null }
  });

  // If all milestones complete, mark roadmap complete and notify
  const allProgress = await prisma.userMilestoneProgress.findMany({ where: { userProgressId: progress.id } });
  const completedCount = allProgress.filter((p: { isComplete: boolean }) => p.isComplete).length;
  if (isComplete && completedCount === roadmap.milestones.length) {
    await prisma.userRoadmapProgress.update({ where: { id: progress.id }, data: { completedAt: new Date() } });
    await notifyUser({
      recipientId: userId,
      type: 'ROADMAP_MILESTONE',
      message: `You completed the roadmap "${roadmap.title}"! 🎉`,
      link: `/roadmaps/${roadmap.slug}`
    });
  }

  return { isComplete };
}

export async function myRoadmaps(userId: string) {
  return prisma.userRoadmapProgress.findMany({
    where: { userId },
    include: {
      roadmap: { include: { milestones: true } },
      milestoneProgress: true
    },
    orderBy: { startedAt: 'desc' }
  });
}
