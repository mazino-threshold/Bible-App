import { logger } from '../../../shared/logger';
import { findUsers } from '../data/users.reads';
import { toAdminUserDto } from '../users.mapper';
import type { ListUsersInput } from '../users.schemas';
import type { AdminUserDto } from '../users.types';

export async function listUsers(input: ListUsersInput): Promise<AdminUserDto[]> {
  const users = await findUsers(input.status);
  logger.debug('Users listed', { status: input.status, count: users.length });
  return users.map(toAdminUserDto);
}
