import { Router } from 'express';
import { requireAdmin, requireAuth } from '../auth/auth.middleware';
import { getCurrentWeeklyReportHandler, getWeeklyReportHandler } from './reports.controller';

/** Admins only. Mounted at /admin/reports */
export const adminReportsRouter = Router();

adminReportsRouter.use(requireAuth, requireAdmin);

// 'current' is registered first so it isn't treated as a weekStart
adminReportsRouter.get('/weekly/current', getCurrentWeeklyReportHandler);
adminReportsRouter.get('/weekly/:weekStart', getWeeklyReportHandler);
