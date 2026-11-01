import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware';
import {
  checkInHandler,
  getMyCurrentWeekHandler,
  getMyWeekHandler,
  undoCheckInHandler,
} from './checkins.controller';

/** The signed-in user's own check-ins. Nobody can check in for someone else. Mounted at /check-ins */
export const checkInsRouter = Router();

checkInsRouter.use(requireAuth);

checkInsRouter.post('/today', checkInHandler);
checkInsRouter.delete('/today', undoCheckInHandler);
checkInsRouter.get('/week', getMyCurrentWeekHandler);
checkInsRouter.get('/weeks/:weekStart', getMyWeekHandler);
