import { Router } from 'express';
import { requireAdmin, requireAuth } from '../auth/auth.middleware';
import { getCurrentWeekHandler, getWeekHandler, listWeeksHandler, saveWeekHandler } from './schedule.controller';

/** Any signed-in user: view readings. Mounted at /schedule */
export const scheduleRouter = Router();

scheduleRouter.use(requireAuth);

scheduleRouter.get('/current', getCurrentWeekHandler);
scheduleRouter.get('/weeks/:weekStart', getWeekHandler);

/** Admins only: manage readings. Mounted at /admin/schedule */
export const adminScheduleRouter = Router();

adminScheduleRouter.use(requireAuth, requireAdmin);

adminScheduleRouter.get('/weeks', listWeeksHandler);
adminScheduleRouter.put('/weeks/:weekStart', saveWeekHandler);
