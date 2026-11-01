import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware';
import { getMeHandler, updateMeHandler } from './users.controller';

export const meRouter = Router();

meRouter.use(requireAuth);

meRouter.get('/', getMeHandler);
meRouter.patch('/', updateMeHandler);
