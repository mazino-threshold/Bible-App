import type { Request, Response } from 'express';
import { currentUser } from '../auth/auth.middleware';
import { weekStartParams } from '../schedule/schedule.schemas';
import { checkInToday } from './commands/check-in.command';
import { undoCheckInToday } from './commands/undo-check-in.command';
import { getMyWeek } from './queries/get-my-week.query';

/** POST /check-ins/today */
export async function checkInHandler(req: Request, res: Response) {
  res.json(await checkInToday(currentUser(req).id));
}

/** DELETE /check-ins/today */
export async function undoCheckInHandler(req: Request, res: Response) {
  res.json(await undoCheckInToday(currentUser(req).id));
}

/** GET /check-ins/week */
export async function getMyCurrentWeekHandler(req: Request, res: Response) {
  res.json({ week: await getMyWeek(currentUser(req).id) });
}

/** GET /check-ins/weeks/:weekStart */
export async function getMyWeekHandler(req: Request, res: Response) {
  const { weekStart } = weekStartParams.parse(req.params);
  res.json({ week: await getMyWeek(currentUser(req).id, weekStart) });
}
