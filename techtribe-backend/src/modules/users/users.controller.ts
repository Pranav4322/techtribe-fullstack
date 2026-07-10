import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as usersService from './users.service';

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await usersService.getPublicProfile(req.params.username, req.user?.id);
  res.status(200).json({ success: true, data: { profile } });
});

export const updateMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await usersService.updateProfile(req.user!.id, req.body);
  res.status(200).json({ success: true, message: 'Profile updated', data: { user } });
});

export const follow = asyncHandler(async (req: Request, res: Response) => {
  await usersService.followUser(req.user!.id, req.params.username);
  res.status(200).json({ success: true, message: `You are now following ${req.params.username}` });
});

export const unfollow = asyncHandler(async (req: Request, res: Response) => {
  await usersService.unfollowUser(req.user!.id, req.params.username);
  res.status(200).json({ success: true, message: `You unfollowed ${req.params.username}` });
});

export const dashboard = asyncHandler(async (req: Request, res: Response) => {
  const stats = await usersService.getDashboardStats(req.user!.id);
  res.status(200).json({ success: true, data: { stats } });
});

export const leaderboard = asyncHandler(async (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 3;
  const users = await usersService.getLeaderboard(limit);
  res.status(200).json({ success: true, data: { users } });
});
