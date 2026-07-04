import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './notifications.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listNotifications(req.user!.id, {
    page: req.query.page as string,
    limit: req.query.limit as string,
    unreadOnly: req.query.unreadOnly as string
  });
  res.status(200).json({ success: true, data: result });
});

export const unreadCount = asyncHandler(async (req: Request, res: Response) => {
  const count = await service.unreadCount(req.user!.id);
  res.status(200).json({ success: true, data: { count } });
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const notification = await service.markAsRead(req.user!.id, req.params.id);
  res.status(200).json({ success: true, data: { notification } });
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  await service.markAllAsRead(req.user!.id);
  res.status(200).json({ success: true, message: 'All notifications marked as read' });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.deleteNotification(req.user!.id, req.params.id);
  res.status(200).json({ success: true, message: 'Notification deleted' });
});
