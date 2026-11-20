import { sendEmail } from '../../../shared/email';
import { sendPushMessages } from '../../../shared/expo-push';
import { logger } from '../../../shared/logger';
import { findAdminContacts } from '../data/users.reads';
import { accountDeletedEmail, formatPurgeDate, userLeftEmail } from '../templates/account-deleted.email';
import type { DeletedUserRow } from '../users.types';

/**
 * Emails the person that their account is deleted and when it will be erased. When they deleted it themselves,
 * also tells every active admin by email and push. Never throws: the account is already deleted, so a failed
 * email or push is logged, not shown to the user.
 */
export async function notifyAccountDeleted(user: DeletedUserRow): Promise<void> {
  const byAdmin = user.requested_by === 'admin';
  const sends: Promise<unknown>[] = [
    sendEmail({ to: user.email, ...accountDeletedEmail(user.name, user.purge_after, byAdmin) }),
  ];

  if (!byAdmin) {
    try {
      const admins = await findAdminContacts();
      for (const admin of admins.emails) {
        sends.push(
          sendEmail({ to: admin.email, ...userLeftEmail(admin.name, user, user.deletion_reason, user.purge_after) }),
        );
      }
      if (admins.pushTokens.length > 0) {
        sends.push(
          sendPushMessages(
            admins.pushTokens.map((to) => ({
              to,
              title: 'A member deleted their account',
              body: `${user.name} deleted their account. It can be restored until ${formatPurgeDate(user.purge_after)}.`,
              data: { type: 'account_deleted', userId: user.id },
            })),
          ),
        );
      }
    } catch (err) {
      logger.error('Account deleted: could not look up admins to notify', { targetUserId: user.id, error: err });
    }
  }

  const failed = (await Promise.allSettled(sends)).filter((r): r is PromiseRejectedResult => r.status === 'rejected');
  if (failed.length > 0) {
    logger.error('Account deleted: some notifications failed', {
      targetUserId: user.id,
      failed: failed.length,
      errors: failed.map((r) => String(r.reason)),
    });
  }
}
