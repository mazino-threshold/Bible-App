import { env } from '../config/env';

interface Email {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendEmail(email: Email): Promise<void> {
  if (!env.RESEND_API_KEY) {
    if (env.NODE_ENV === 'production') {
      throw new Error('RESEND_API_KEY is not set');
    }
    // Development fallback: print the email so you can test without an email provider
    console.log(`\n--- Email to ${email.to} ---\nSubject: ${email.subject}\n${email.text}\n---------------\n`);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [email.to],
      subject: email.subject,
      text: email.text,
      html: email.html,
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend error ${res.status}: ${await res.text()}`);
  }
}
