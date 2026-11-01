import { Router } from 'express';
import { db } from '../db/pool';
import { todayInNigeria } from '../lib/time';

export const healthRouter = Router();

// Quick check that the API is up and can reach the database
healthRouter.get('/', async (_req, res) => {
  await db.query('SELECT 1');
  res.json({ status: 'ok', today: todayInNigeria() });
});
