import { Router } from 'express';
import { requireAdmin, requireAuth } from '../auth/auth.middleware';
import {
  deactivateUserHandler,
  getMeHandler,
  listUsersHandler,
  reactivateUserHandler,
  updateMeHandler,
} from './users.controller';

export const meRouter = Router();

meRouter.use(requireAuth);

meRouter.get('/', getMeHandler);
meRouter.patch('/', updateMeHandler);

/** Admins only: manage users. Mounted at /admin/users */
export const adminUsersRouter = Router();

adminUsersRouter.use(requireAuth, requireAdmin);

adminUsersRouter.get('/', listUsersHandler);
adminUsersRouter.post('/:id/deactivate', deactivateUserHandler);
adminUsersRouter.post('/:id/reactivate', reactivateUserHandler);
