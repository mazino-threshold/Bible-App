import type { Request, Response } from 'express';
import { currentUser } from '../auth/auth.middleware';
import { saveWeek } from './commands/save-week.command';
import { getCurrentWeek, getWeek } from './queries/get-week.query';
import { listWeeks } from './queries/list-weeks.query';
import { saveWeekSchema, weekStartParams } from './schedule.schemas';

/** GET /schedule/current */
export async function getCurrentWeekHandler(_req: Request, res: Response) {
  res.json({ week: await getCurrentWeek() });
}

/** GET /schedule/weeks/:weekStart */
export async function getWeekHandler(req: Request, res: Response) {
  const { weekStart } = weekStartParams.parse(req.params);
  res.json({ week: await getWeek(weekStart) });
}

/** GET /admin/schedule/weeks */
export async function listWeeksHandler(_req: Request, res: Response) {
  res.json({ weeks: await listWeeks() });
}

/** PUT /admin/schedule/weeks/:weekStart */
export async function saveWeekHandler(req: Request, res: Response) {
  const { weekStart } = weekStartParams.parse(req.params);
  const week = await saveWeek(weekStart, saveWeekSchema.parse(req.body), currentUser(req).id);
  res.json({ week });
}
