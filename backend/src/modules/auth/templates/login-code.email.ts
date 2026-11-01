export function loginCodeEmail(name: string, code: string, ttlMinutes: number) {
  return {
    subject: `Your Bible App code: ${code}`,
    text: `Hi ${name},\n\nYour sign-in code is ${code}. It expires in ${ttlMinutes} minutes.\n\nIf you didn't ask for this, you can ignore this email.`,
    html: `<p>Hi ${escapeHtml(name)},</p>
<p>Your sign-in code is:</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p>
<p>It expires in ${ttlMinutes} minutes.</p>
<p style="color:#666">If you didn't ask for this, you can ignore this email.</p>`,
  };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
