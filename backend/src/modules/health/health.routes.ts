import { Router } from 'express';
import { healthHandler, liveHandler } from './health.controller';

export const healthRouter = Router();

healthRouter.get('/', healthHandler);
// For the keep-alive cron job: no database call
healthRouter.get('/live', liveHandler);
