import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './challenges.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listChallenges({
    page: req.query.page as string,
    limit: req.query.limit as string,
    difficulty: req.query.difficulty as string,
    tag: req.query.tag as string
  });
  res.status(200).json({ success: true, data: result });
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const challenge = await service.getChallenge(req.params.slug, req.user?.id);
  res.status(200).json({ success: true, data: { challenge } });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const challenge = await service.createChallenge(req.body);
  res.status(201).json({ success: true, message: 'Challenge created', data: { challenge } });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.deleteChallenge(req.params.slug);
  res.status(200).json({ success: true, message: 'Challenge deleted' });
});

export const submit = asyncHandler(async (req: Request, res: Response) => {
  const submission = await service.submitSolution(req.user!.id, req.params.slug, req.body.code, req.body.language);
  res.status(201).json({ success: true, data: { submission } });
});

export const mySubmissions = asyncHandler(async (req: Request, res: Response) => {
  const submissions = await service.listMySubmissions(req.user!.id, req.params.slug);
  res.status(200).json({ success: true, data: { submissions } });
});

export const bookmark = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.toggleBookmark(req.user!.id, req.params.slug);
  res.status(200).json({ success: true, data: result });
});
