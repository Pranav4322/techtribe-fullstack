import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { env, isProduction } from '../../config/env';
import { durationToMs } from '../../utils/jwt';
import * as authService from './auth.service';

const REFRESH_COOKIE = 'refreshToken';

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: durationToMs(env.JWT_REFRESH_EXPIRES_IN),
    path: '/api/v1/auth'
  });
}

function device(req: Request) {
  return { userAgent: req.headers['user-agent'], ipAddress: req.ip };
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(req.body, device(req));
  setRefreshCookie(res, result.refreshToken);
  res.status(201).json({
    success: true,
    message: 'Account created. Please check your email to verify your account.',
    data: { user: result.user, accessToken: result.accessToken }
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body, device(req));
  setRefreshCookie(res, result.refreshToken);
  res.status(200).json({
    success: true,
    message: 'Logged in successfully',
    data: { user: result.user, accessToken: result.accessToken }
  });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.body.refreshToken || req.cookies?.[REFRESH_COOKIE];
  if (!token) throw ApiError.unauthorized('No refresh token provided');
  const result = await authService.refresh(token, device(req));
  setRefreshCookie(res, result.refreshToken);
  res.status(200).json({
    success: true,
    data: { user: result.user, accessToken: result.accessToken }
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : req.cookies?.accessToken;
  const refreshToken = req.body.refreshToken || req.cookies?.[REFRESH_COOKIE];
  if (accessToken) await authService.logout(accessToken, refreshToken);
  res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

export const logoutAll = asyncHandler(async (req: Request, res: Response) => {
  await authService.logoutAllDevices(req.user!.id);
  res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
  res.status(200).json({ success: true, message: 'Logged out from all devices' });
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const token = (req.query.token as string) || req.body.token;
  await authService.verifyEmail(token);
  res.status(200).json({ success: true, message: 'Email verified successfully' });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.forgotPassword(req.body.email);
  res.status(200).json({
    success: true,
    message: 'If that email is registered, a password reset link has been sent.'
  });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.resetPassword(req.body.token, req.body.newPassword);
  res.status(200).json({ success: true, message: 'Password reset successfully. Please log in again.' });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
  res.status(200).json({ success: true, message: 'Password changed successfully' });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({ success: true, data: { user: req.user } });
});
