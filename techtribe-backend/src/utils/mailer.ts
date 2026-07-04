import nodemailer from 'nodemailer';
import { env, isProduction } from '../config/env';
import { logger } from '../config/logger';

const transporter =
  env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT ?? 587,
        secure: env.SMTP_SECURE ?? false,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
      })
    : null;

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<void> {
  if (!transporter) {
    // No SMTP configured (e.g. local dev) — log instead of failing the request.
    logger.warn(`[mailer] SMTP not configured — would have sent "${subject}" to ${to}`);
    if (!isProduction) logger.debug(`[mailer] body preview: ${html.slice(0, 300)}`);
    return;
  }
  await transporter.sendMail({
    from: env.SMTP_FROM || 'TechTribe <no-reply@techtribe.dev>',
    to,
    subject,
    html
  });
}

export function verificationEmailTemplate(username: string, verifyUrl: string): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:auto">
      <h2>Welcome to TechTribe, ${username}!</h2>
      <p>Please confirm your email address to activate your account.</p>
      <p><a href="${verifyUrl}" style="background:#6366f1;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">Verify Email</a></p>
      <p>Or copy this link: ${verifyUrl}</p>
      <p style="color:#888;font-size:12px">This link expires in 24 hours.</p>
    </div>`;
}

export function passwordResetEmailTemplate(username: string, resetUrl: string): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:auto">
      <h2>Password reset requested</h2>
      <p>Hi ${username}, click below to reset your password. If you didn't request this, ignore this email.</p>
      <p><a href="${resetUrl}" style="background:#6366f1;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">Reset Password</a></p>
      <p style="color:#888;font-size:12px">This link expires in 1 hour.</p>
    </div>`;
}
