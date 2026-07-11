import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env';
import { httpLogStream } from './config/logger';
import { generalRateLimiter } from './middleware/rateLimit.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import apiRoutes from './routes/index';

export function createApp(): Application {
  const app = express();

  const allowedOrigins = env.CLIENT_ORIGIN.split(',').map((o) => o.trim());
  // Vercel generates extra URLs beyond the main production domain for every
  // branch/preview build (e.g. techtribe-fullstack-git-master-<team>.vercel.app,
  // or techtribe-fullstack-<hash>-<team>.vercel.app). Rather than needing to
  // manually add every one of these to CLIENT_ORIGIN, allow any *.vercel.app
  // origin that starts with "techtribe-fullstack" — this project's prefix.
  const vercelPreviewPattern = /^https:\/\/techtribe-fullstack[a-z0-9-]*\.vercel\.app$/;

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin) || vercelPreviewPattern.test(origin)) {
          return callback(null, true);
        }
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      },
      credentials: true
    })
  );
  app.use(compression());
  app.use(express.json({ limit: '3mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(cookieParser());
  app.use(morgan('combined', { stream: httpLogStream }));
  app.use('/api', generalRateLimiter);

  app.get('/', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'TechTribe API' });
  });

  app.use('/api/v1', apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
