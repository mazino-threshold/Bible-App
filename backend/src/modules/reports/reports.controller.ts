import type { Request, Response } from 'express';
import { weekStartParams } from '../schedule/schedule.schemas';
import { getCurrentWeeklyReport, getWeeklyReport } from './queries/get-weekly-report.query';
import { reportFiltersSchema } from './reports.schemas';

/** GET /admin/reports/weekly/current */
export async function getCurrentWeeklyReportHandler(req: Request, res: Response) {
  res.json({ report: await getCurrentWeeklyReport(reportFiltersSchema.parse(req.query)) });
}

/** GET /admin/reports/weekly/:weekStart */
export async function getWeeklyReportHandler(req: Request, res: Response) {
  const { weekStart } = weekStartParams.parse(req.params);
  res.json({ report: await getWeeklyReport(weekStart, reportFiltersSchema.parse(req.query)) });
}
