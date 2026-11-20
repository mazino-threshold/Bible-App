import { escapeHtml } from '../../../shared/email';
import { APP_TIME_ZONE } from '../../../shared/time';

const CLUB = 'Brethren Bible Reading Club';

const longDate = new Intl.DateTimeFormat('en-GB', {
  timeZone: APP_TIME_ZONE,
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** e.g. "20 December 2026", in Nigeria time. */
export function formatPurgeDate(date: Date): string {
  return longDate.format(date);
}

/** To the person whose account was deleted, by themselves or by an admin. */
export function accountDeletedEmail(name: string, purgeAfter: Date, byAdmin: boolean) {
  const when = formatPurgeDate(purgeAfter);
  const opening = byAdmin ? `An admin has deleted your ${CLUB} account.` : `Your ${CLUB} account has been deleted.`;
  const hold =
    `We will keep a copy of your details and reading history until ${when}, only so it can be restored if you ask. ` +
    'After that it is erased for good.';
  const restore = 'If this was a mistake, contact an admin before then.';
  return {
    subject: `Your ${CLUB} account has been deleted`,
    text: `Hi ${name},\n\n${opening}\n\n${hold}\n\n${restore}`,
    html: `<p>Hi ${escapeHtml(name)},</p>
<p>${opening}</p>
<p>${hold}</p>
<p style="color:#666">${restore}</p>`,
  };
}

/** To an admin when a user deletes their own account. */
export function userLeftEmail(
  adminName: string,
  user: { name: string; email: string },
  reason: string | null,
  purgeAfter: Date,
) {
  const when = formatPurgeDate(purgeAfter);
  const reasonLine = reason ? `Reason given: ${reason}` : 'No reason given.';
  const hold = `The account can be restored from Deleted accounts until ${when}. After that it is erased for good.`;
  return {
    subject: `${user.name} deleted their ${CLUB} account`,
    text: `Hi ${adminName},\n\n${user.name} (${user.email}) has deleted their account.\n\n${reasonLine}\n\n${hold}`,
    html: `<p>Hi ${escapeHtml(adminName)},</p>
<p><strong>${escapeHtml(user.name)}</strong> (${escapeHtml(user.email)}) has deleted their account.</p>
<p>${escapeHtml(reasonLine)}</p>
<p style="color:#666">${hold}</p>`,
  };
}
