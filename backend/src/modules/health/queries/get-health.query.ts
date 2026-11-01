import { todayInNigeria } from '../../../shared/time';
import { pingDatabase } from '../data/health.reads';

export async function getHealth(): Promise<{ status: 'ok'; today: string }> {
  await pingDatabase();
  return { status: 'ok', today: todayInNigeria() };
}
