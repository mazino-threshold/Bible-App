import { env } from '../config/env';
import { logger } from './logger';

interface Email {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/** Sends an email through the provider chosen by EMAIL_PROVIDER. */
export async function sendEmail(email: Email): Promise<void> {
  switch (env.EMAIL_PROVIDER) {
    case 'brevo':
      await sendWithBrevo(email);
      break;
    case 'resend':
      await sendWithResend(email);
      break;
    case 'console':
      // Development only: print the email so you can test without an email provider
      logger.info(`Email to ${email.to} (not sent, EMAIL_PROVIDER=console)\nSubject: ${email.subject}\n${email.text}`);
      return;
  }
  // The subject and body are not logged: they contain the login code
  logger.debug('Email sent', { provider: env.EMAIL_PROVIDER, to: email.to });
}

// https://developers.brevo.com/reference/sendtransacemail
async function sendWithBrevo(email: Email): Promise<void> {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': env.BREVO_API_KEY!,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: env.EMAIL_FROM_NAME, email: env.EMAIL_FROM_ADDRESS },
      to: [{ email: email.to }],
      subject: email.subject,
      textContent: email.text,
      htmlContent: email.html,
    }),
  });

  if (!res.ok) {
    throw new Error(`Brevo error ${res.status}: ${await res.text()}`);
  }
}

// https://resend.com/docs/api-reference/emails/send-email
async function sendWithResend(email: Email): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${env.EMAIL_FROM_NAME} <${env.EMAIL_FROM_ADDRESS}>`,
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
