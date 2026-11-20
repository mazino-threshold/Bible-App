import { purgeDeletedUsers } from '../commands/purge-deleted-users.command';
import { findDeletedUsers } from '../data/users.reads';
import { toDeletedUserDto } from '../users.mapper';
import type { DeletedUserDto } from '../users.types';

/** Deleted accounts that can still be restored, most recently deleted first. */
export async function listDeletedUsers(): Promise<DeletedUserDto[]> {
  await purgeDeletedUsers();
  return (await findDeletedUsers()).map(toDeletedUserDto);
}
