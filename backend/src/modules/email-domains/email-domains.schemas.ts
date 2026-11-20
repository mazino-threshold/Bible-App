import { z } from 'zod';
import { emailField } from '../../shared/validation';

/** A domain such as 'example.com' or 'mail.example.co.uk'. A leading '@' is ignored. */
export const domainField = z
  .string()
  .trim()
  .toLowerCase()
  .transform((d) => d.replace(/^@/, ''))
  .pipe(
    z
      .string()
      .max(253)
      .regex(/^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,62}$/, 'Enter a domain such as example.com'),
  );

export const domainParams = z.object({ domain: domainField });

/** Body of PUT /admin/email-domains/:domain */
export const domainRuleSchema = z.object({
  action: z.enum(['block', 'allow']),
  reason: z.string().trim().max(500).optional(),
});

export type DomainRuleInput = z.infer<typeof domainRuleSchema>;

/** ?email=someone@example.com or ?domain=example.com */
export const domainCheckSchema = z.union([z.object({ email: emailField }), z.object({ domain: domainField })]);
