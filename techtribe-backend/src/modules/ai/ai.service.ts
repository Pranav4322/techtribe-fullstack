import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';
import { callClaude } from './anthropic.client';

async function logUsage(userId: string, feature: string, inputChars: number, outputChars: number) {
  await prisma.aiUsageLog.create({ data: { userId, feature, inputChars, outputChars } });
}

interface QuizQuestion {
  q: string;
  options: string[];
  answer: number;
  explanation: string;
}

export async function generateQuiz(userId: string, language: string, difficulty: string) {
  const prompt = `Generate exactly 3 multiple-choice questions for ${language} at ${difficulty} level. Respond ONLY with valid JSON, no markdown fences, no extra text: {"questions":[{"q":"question text","options":["A","B","C","D"],"answer":0,"explanation":"why correct"}]}`;
  const text = await callClaude(prompt, 1200);
  await logUsage(userId, 'quiz', prompt.length, text.length);

  let questions: QuizQuestion[];
  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    questions = parsed.questions || [];
  } catch {
    throw ApiError.internal('AI returned an unexpected quiz format. Please try again.');
  }
  if (!Array.isArray(questions) || questions.length === 0) {
    throw ApiError.internal('AI did not return any questions. Please try again.');
  }

  // Persist as reusable MCQ bank content tagged as AI-generated (best-effort, category may not exist)
  const category = await prisma.mcqCategory.upsert({
    where: { slug: language.toLowerCase().replace(/[^a-z0-9]+/g, '-') },
    create: { slug: language.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: language },
    update: {}
  });
  const difficultyMap: Record<string, 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'> = {
    Beginner: 'BEGINNER',
    Intermediate: 'INTERMEDIATE',
    Advanced: 'ADVANCED'
  };
  await prisma.mcqQuestion.createMany({
    data: questions.map((q) => ({
      categoryId: category.id,
      question: q.q,
      options: q.options,
      correctIndex: q.answer,
      explanation: q.explanation,
      difficulty: difficultyMap[difficulty] || 'BEGINNER',
      source: 'ai_generated'
    }))
  });

  return { questions };
}

export async function summarizeContent(userId: string, content: string) {
  const prompt = `Summarize this article for developers. Use: **TL;DR** (2 sentences), **Key Points** (bullet list), **Why It Matters** (2–3 sentences).\n\n---\n\n${content}`;
  const text = await callClaude(prompt, 1000);
  await logUsage(userId, 'summary', prompt.length, text.length);
  return { summary: text };
}

export async function buildLearningPath(userId: string, goal: string, level: string) {
  const prompt = `Create a detailed 6-month learning roadmap. Goal: ${goal}. Level: ${level}. Format: Month 1, Month 2, etc. Each month: what to learn, tools/resources, mini-project. Be concrete and practical.`;
  const text = await callClaude(prompt, 1600);
  await logUsage(userId, 'path', prompt.length, text.length);
  return { path: text };
}

export async function reviewCode(userId: string, code: string) {
  const prompt = `Review this code as a senior developer. Cover: **Readability**, **Logic & correctness**, **Performance**, **Security**, **Best practices**. Give specific, actionable feedback with corrected examples.\n\n---\n\n${code}`;
  const text = await callClaude(prompt, 1400);
  await logUsage(userId, 'review', prompt.length, text.length);
  return { review: text };
}

export async function quickAsk(userId: string, question: string) {
  const prompt = `Answer this developer question concisely (3–5 sentences or a short code snippet if relevant): ${question}`;
  const text = await callClaude(prompt, 600);
  await logUsage(userId, 'quickask', prompt.length, text.length);
  return { answer: text };
}
