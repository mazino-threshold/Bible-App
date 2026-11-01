import { Router } from 'express';
import { runRemindersHandler } from './reminders.controller';
import { requireCronSecret } from './reminders.middleware';

/** Called by the cron job, not the app. Mounted at /internal/reminders */
export const remindersRouter = Router();

remindersRouter.use(requireCronSecret);

remindersRouter.post('/run', runRemindersHandler);
