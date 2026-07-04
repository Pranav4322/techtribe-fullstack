import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './languages.service';

export const list = asyncHandler(async (_req: Request, res: Response) => {
  const languages = await service.listLanguages();
  res.status(200).json({ success: true, data: { languages } });
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const language = await service.getLanguageBySlug(req.params.slug);
  res.status(200).json({ success: true, data: { language } });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const language = await service.createLanguage(req.body);
  res.status(201).json({ success: true, message: 'Language created', data: { language } });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const language = await service.updateLanguage(req.params.slug, req.body);
  res.status(200).json({ success: true, message: 'Language updated', data: { language } });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.deleteLanguage(req.params.slug);
  res.status(200).json({ success: true, message: 'Language deleted' });
});

export const upsertSection = asyncHandler(async (req: Request, res: Response) => {
  const section = await service.upsertSection(req.params.slug, req.body);
  res.status(200).json({ success: true, message: 'Section saved', data: { section } });
});

export const deleteSection = asyncHandler(async (req: Request, res: Response) => {
  await service.deleteSection(req.params.slug, req.params.key);
  res.status(200).json({ success: true, message: 'Section deleted' });
});
