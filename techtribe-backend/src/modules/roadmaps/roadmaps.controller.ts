import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './roadmaps.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const roadmaps = await service.listRoadmaps({ level: req.query.level as string });
  res.status(200).json({ success: true, data: { roadmaps } });
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const roadmap = await service.getRoadmap(req.params.slug, req.user?.id);
  res.status(200).json({ success: true, data: { roadmap } });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const roadmap = await service.createRoadmap(req.user!.id, req.body);
  res.status(201).json({ success: true, message: 'Roadmap created', data: { roadmap } });
});

export const generate = asyncHandler(async (req: Request, res: Response) => {
  const roadmap = await service.generateRoadmap(req.user!.id, req.body.goal, req.body.level);
  res.status(201).json({ success: true, message: 'Personalized roadmap generated', data: { roadmap } });
});

export const start = asyncHandler(async (req: Request, res: Response) => {
  const progress = await service.startRoadmap(req.user!.id, req.params.slug);
  res.status(200).json({ success: true, data: { progress } });
});

export const toggleMilestone = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.toggleMilestone(req.user!.id, req.params.slug, req.params.milestoneId);
  res.status(200).json({ success: true, data: result });
});

export const mine = asyncHandler(async (req: Request, res: Response) => {
  const roadmaps = await service.myRoadmaps(req.user!.id);
  res.status(200).json({ success: true, data: { roadmaps } });
});
