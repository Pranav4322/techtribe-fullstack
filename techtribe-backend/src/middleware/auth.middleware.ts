import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { verifyAccessToken } from '../utils/jwt';
import { redis } from '../config/redis';
import { asyncHandler } from '../utils/asyncHandler';
import { Role } from '@prisma/client';

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  if (req.cookies?.accessToken) return req.cookies.accessToken;
  return null;
}

/** Requires a valid, non-blacklisted access token. Populates req.user. */
export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const token = extractToken(req);
  if (!token) throw ApiError.unauthorized('Authentication token missing');

  const isBlacklisted = await redis.get(`bl:${token}`);
  if (isBlacklisted) throw ApiError.unauthorized('Session has been invalidated. Please log in again.');

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email, username: payload.username, role: payload.role };
    next();
  } catch {
    throw ApiError.unauthorized('Invalid or expired access token');
  }
});

/** Populates req.user if a valid token is present, but does not fail otherwise. */
export const optionalAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const token = extractToken(req);
  if (!token) return next();
  const isBlacklisted = await redis.get(`bl:${token}`);
  if (isBlacklisted) return next();
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email, username: payload.username, role: payload.role };
  } catch {
    // ignore invalid token for optional auth
  }
  next();
});

export const requireRole = (...roles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden('Insufficient permissions'));
    next();
  };
};
