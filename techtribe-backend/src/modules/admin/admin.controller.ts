import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './admin.service';

export const stats = asyncHandler(async (_req: Request, res: Response) => {
  const data = await service.getPlatformStats();
  res.status(200).json({ success: true, data: { stats: data } });
});

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listUsers({
    page: req.query.page as string,
    limit: req.query.limit as string,
    search: req.query.search as string,
    role: req.query.role as string
  });
  res.status(200).json({ success: true, data: result });
});

export const banUser = asyncHandler(async (req: Request, res: Response) => {
  await service.banUser(req.user!.id, req.params.userId, req.body.reason);
  res.status(200).json({ success: true, message: 'User banned' });
});

export const unbanUser = asyncHandler(async (req: Request, res: Response) => {
  await service.unbanUser(req.user!.id, req.params.userId);
  res.status(200).json({ success: true, message: 'User unbanned' });
});

export const updateRole = asyncHandler(async (req: Request, res: Response) => {
  const user = await service.updateUserRole(req.user!.id, req.params.userId, req.body.role);
  res.status(200).json({ success: true, message: 'Role updated', data: { user } });
});

export const listReports = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listReports({
    page: req.query.page as string,
    limit: req.query.limit as string,
    status: req.query.status as string
  });
  res.status(200).json({ success: true, data: result });
});

export const resolveReport = asyncHandler(async (req: Request, res: Response) => {
  const report = await service.resolveReport(req.user!.id, req.params.reportId, req.body.status, req.body.resolvedNote);
  res.status(200).json({ success: true, message: 'Report updated', data: { report } });
});

export const announcement = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.broadcastAnnouncement(req.user!.id, req.body.message, req.body.link);
  res.status(200).json({ success: true, message: 'Announcement sent', data: result });
});

export const auditLog = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.getAuditLog({ page: req.query.page as string, limit: req.query.limit as string });
  res.status(200).json({ success: true, data: result });
});
