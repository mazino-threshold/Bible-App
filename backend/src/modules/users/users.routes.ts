import { Router } from 'express';
import { requireAdmin, requireAuth } from '../auth/auth.middleware';
import {
  deactivateUserHandler,
  deleteMeHandler,
  deleteUserHandler,
  getMeHandler,
  listDeletedUsersHandler,
  listUsersHandler,
  reactivateUserHandler,
  restoreDeletedUserHandler,
  setRoleHandler,
  updateMeHandler,
} from './users.controller';

export const meRouter = Router();

meRouter.use(requireAuth);

meRouter.get('/', getMeHandler);
meRouter.patch('/', updateMeHandler);
meRouter.delete('/', deleteMeHandler);

/** Admins only: manage users. Mounted at /admin/users */
export const adminUsersRouter = Router();

adminUsersRouter.use(requireAuth, requireAdmin);

adminUsersRouter.get('/', listUsersHandler);
adminUsersRouter.post('/:id/deactivate', deactivateUserHandler);
adminUsersRouter.post('/:id/reactivate', reactivateUserHandler);
adminUsersRouter.put('/:id/role', setRoleHandler);
adminUsersRouter.delete('/:id', deleteUserHandler);

/** Admins only: deleted accounts still being held, and restoring them. Mounted at /admin/deleted-users */
export const adminDeletedUsersRouter = Router();

adminDeletedUsersRouter.use(requireAuth, requireAdmin);

adminDeletedUsersRouter.get('/', listDeletedUsersHandler);
adminDeletedUsersRouter.post('/:id/restore', restoreDeletedUserHandler);
