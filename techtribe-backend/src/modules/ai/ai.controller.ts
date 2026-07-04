import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as aiService from './ai.service';

export const quiz = asyncHandler(async (req: Request, res: Response) => {
  const result = await aiService.generateQuiz(req.user!.id, req.body.language, req.body.difficulty);
  res.status(200).json({ success: true, data: result });
});

export const summary = asyncHandler(async (req: Request, res: Response) => {
  const result = await aiService.summarizeContent(req.user!.id, req.body.content);
  res.status(200).json({ success: true, data: result });
});

export const path = asyncHandler(async (req: Request, res: Response) => {
  const result = await aiService.buildLearningPath(req.user!.id, req.body.goal, req.body.level);
  res.status(200).json({ success: true, data: result });
});

export const review = asyncHandler(async (req: Request, res: Response) => {
  const result = await aiService.reviewCode(req.user!.id, req.body.code);
  res.status(200).json({ success: true, data: result });
});

export const quickAsk = asyncHandler(async (req: Request, res: Response) => {
  const result = await aiService.quickAsk(req.user!.id, req.body.question);
  res.status(200).json({ success: true, data: result });
});
