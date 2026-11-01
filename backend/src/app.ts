import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { authRouter } from './modules/auth/auth.routes';
import { healthRouter } from './modules/health/health.routes';
import { meRouter } from './modules/users/users.routes';
import { errorHandler, notFound } from './shared/errors';

export const app = express();

// Render sits in front of the app as a proxy; this lets rate limiting see the real client IP
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/health', healthRouter);
app.use('/auth', authRouter);
app.use('/me', meRouter);

app.use(notFound);
app.use(errorHandler);
