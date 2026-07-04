import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './notes.service';

export const listNotebooks = asyncHandler(async (req: Request, res: Response) => {
  const notebooks = await service.listNotebooks(req.user!.id);
  res.status(200).json({ success: true, data: { notebooks } });
});

export const createNotebook = asyncHandler(async (req: Request, res: Response) => {
  const notebook = await service.createNotebook(req.user!.id, req.body.name, req.body.color);
  res.status(201).json({ success: true, message: 'Notebook created', data: { notebook } });
});

export const deleteNotebook = asyncHandler(async (req: Request, res: Response) => {
  await service.deleteNotebook(req.user!.id, req.params.id);
  res.status(200).json({ success: true, message: 'Notebook deleted' });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listNotes(req.user!.id, {
    page: req.query.page as string,
    limit: req.query.limit as string,
    notebookId: req.query.notebookId as string,
    archived: req.query.archived as string,
    search: req.query.search as string
  });
  res.status(200).json({ success: true, data: result });
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const note = await service.getNote(req.user!.id, req.params.id);
  res.status(200).json({ success: true, data: { note } });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const note = await service.createNote(req.user!.id, req.body);
  res.status(201).json({ success: true, message: 'Note created', data: { note } });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const note = await service.updateNote(req.user!.id, req.params.id, req.body);
  res.status(200).json({ success: true, message: 'Note updated', data: { note } });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.deleteNote(req.user!.id, req.params.id);
  res.status(200).json({ success: true, message: 'Note deleted' });
});
