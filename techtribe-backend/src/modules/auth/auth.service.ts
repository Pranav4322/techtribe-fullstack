import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../config/prisma';
import { redis } from '../../config/redis';
import { ApiError } from '../../utils/ApiError';
import { comparePassword, hashPassword } from '../../utils/password';
import {
  durationToMs,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken
} from '../../utils/jwt';
import { env } from '../../config/env';
import { sendEmail, verificationEmailTemplate, passwordResetEmailTemplate } from '../../utils/mailer';
import { LoginInput, RegisterInput } from './auth.validation';

interface DeviceInfo {
  userAgent?: string;
  ipAddress?: string;
}

function publicUser(user: {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
  isEmailVerified: boolean;
  xp: number;
  level: number;
  createdAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    xp: user.xp,
    level: user.level,
    createdAt: user.createdAt
  };
}

async function issueTokenPair(
  user: { id: string; email: string; username: string; role: import('@prisma/client').Role },
  device: DeviceInfo
) {
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    username: user.username,
    role: user.role
  });
  const { token: refreshToken, jti } = signRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: {
      id: jti,
      token: refreshToken,
      userId: user.id,
      userAgent: device.userAgent,
      ipAddress: device.ipAddress,
      expiresAt: new Date(Date.now() + durationToMs(env.JWT_REFRESH_EXPIRES_IN))
    }
  });

  return { accessToken, refreshToken };
}

export async function register(input: RegisterInput, device: DeviceInfo) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { username: input.username }] }
  });
  if (existing) {
    throw ApiError.conflict(
      existing.email === input.email ? 'Email already registered' : 'Username already taken'
    );
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      username: input.username,
      passwordHash,
      displayName: input.displayName || input.username
    }
  });

  // Email verification token
  const token = uuidv4();
  await prisma.emailVerificationToken.create({
    data: { token, userId: user.id, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) }
  });
  const verifyUrl = `${env.API_BASE_URL}/api/v1/auth/verify-email?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: 'Verify your TechTribe account',
    html: verificationEmailTemplate(user.username, verifyUrl)
  });

  const tokens = await issueTokenPair(user, device);
  return { user: publicUser(user), ...tokens };
}

export async function login(input: LoginInput, device: DeviceInfo) {
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: input.emailOrUsername }, { username: input.emailOrUsername }] }
  });
  if (!user) throw ApiError.unauthorized('Invalid credentials');
  if (user.isBanned) throw ApiError.forbidden(`Account banned: ${user.bannedReason || 'policy violation'}`);
  if (!user.isActive) throw ApiError.forbidden('Account is deactivated');

  const valid = await comparePassword(input.password, user.passwordHash);
  if (!valid) throw ApiError.unauthorized('Invalid credentials');

  await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });

  const tokens = await issueTokenPair(user, device);
  return { user: publicUser(user), ...tokens };
}

export async function refresh(refreshToken: string, device: DeviceInfo) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw ApiError.unauthorized('Refresh token is no longer valid');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.isBanned || !user.isActive) throw ApiError.unauthorized('Account unavailable');

  // Rotate: revoke old refresh token, issue a new pair
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
  const tokens = await issueTokenPair(user, device);
  return { user: publicUser(user), ...tokens };
}

export async function logout(accessToken: string, refreshToken?: string) {
  // Blacklist the current access token until its natural expiry
  const ttlSeconds = Math.ceil(durationToMs(env.JWT_ACCESS_EXPIRES_IN) / 1000);
  await redis.set(`bl:${accessToken}`, '1', 'EX', ttlSeconds);

  if (refreshToken) {
    await prisma.refreshToken
      .updateMany({ where: { token: refreshToken, revokedAt: null }, data: { revokedAt: new Date() } })
      .catch(() => undefined);
  }
}

export async function logoutAllDevices(userId: string) {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() }
  });
}

export async function verifyEmail(token: string) {
  const record = await prisma.emailVerificationToken.findUnique({ where: { token } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw ApiError.badRequest('Verification link is invalid or has expired');
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { isEmailVerified: true } }),
    prisma.emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } })
  ]);
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always respond success-shaped to avoid leaking which emails are registered
  if (!user) return;

  const token = uuidv4();
  await prisma.passwordResetToken.create({
    data: { token, userId: user.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) }
  });
  const resetUrl = `${env.CLIENT_ORIGIN.split(',')[0]}/reset-password?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: 'Reset your TechTribe password',
    html: passwordResetEmailTemplate(user.username, resetUrl)
  });
}

export async function resetPassword(token: string, newPassword: string) {
  const record = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw ApiError.badRequest('Reset link is invalid or has expired');
  }
  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.refreshToken.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } })
  ]);
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('User not found');
  const valid = await comparePassword(currentPassword, user.passwordHash);
  if (!valid) throw ApiError.unauthorized('Current password is incorrect');
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}
