import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware';
import { requireCronSecret } from '../reminders/reminders.middleware';
import { clearPassageCacheHandler, getTodayPassageHandler } from './passages.controller';

/** Any signed-in user: the day's Bible text. Mounted at /passages */
export const passagesRouter = Router();

passagesRouter.use(requireAuth);

passagesRouter.get('/today', getTodayPassageHandler);

/** Called by the cron job every Sunday, not the app. Mounted at /internal/passage-cache */
export const passageCacheRouter = Router();

passageCacheRouter.use(requireCronSecret);

passageCacheRouter.post('/clear', clearPassageCacheHandler);
