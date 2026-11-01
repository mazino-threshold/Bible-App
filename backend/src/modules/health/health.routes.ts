import { Router } from 'express';
import { healthHandler } from './health.controller';

export const healthRouter = Router();

healthRouter.get('/', healthHandler);
