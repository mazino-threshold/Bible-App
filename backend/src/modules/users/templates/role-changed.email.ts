import { escapeHtml } from '../../../shared/email';
import type { Role } from '../users.types';

const CLUB = 'Brethren Bible Reading Club';

/** To someone who has just been made an admin, or had admin access removed. */
export function roleChangedEmail(name: string, role: Role) {
  const promoted = role === 'admin';
  const subject = promoted ? `You're now an admin of the ${CLUB}` : `Your ${CLUB} admin access has been removed`;
  const body = promoted
    ? 'An admin has given you admin access. Open the app to see the Admin screens: the reading schedule, weekly reports and members.'
    : 'An admin has removed your admin access. You can still use the app as a member as usual.';
  return {
    subject,
    text: `Hi ${name},\n\n${body}`,
    html: `<p>Hi ${escapeHtml(name)},</p>\n<p>${body}</p>`,
  };
}
