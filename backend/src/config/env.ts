import { config } from 'dotenv';
import { z } from 'zod';

config({ quiet: true });

// Treats an empty value (e.g. 'BREVO_API_KEY=') the same as not set
const optionalString = z
  .string()
  .optional()
  .transform((v) => v || undefined);

const schema = z
  .object({
    PORT: z.coerce.number().int().positive().default(4000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: z.url({ message: 'DATABASE_URL must be set to your Neon connection string' }),

    // Defaults to debug in development, info in production
    LOG_LEVEL: z.preprocess((v) => v || undefined, z.enum(['error', 'warn', 'info', 'debug']).optional()),

    // console = print emails to the terminal (development only)
    EMAIL_PROVIDER: z.enum(['console', 'brevo', 'resend']).default('console'),
    EMAIL_FROM_NAME: z.string().min(1).default('Bible App'),
    EMAIL_FROM_ADDRESS: optionalString,
    BREVO_API_KEY: optionalString,
    RESEND_API_KEY: optionalString,
  })
  .superRefine((env, ctx) => {
    const require = (key: keyof typeof env, why: string) => {
      if (!env[key]) ctx.addIssue({ code: 'custom', path: [key], message: why });
    };

    if (env.EMAIL_PROVIDER === 'console' && env.NODE_ENV === 'production') {
      ctx.addIssue({ code: 'custom', path: ['EMAIL_PROVIDER'], message: 'must be brevo or resend in production' });
    }
    if (env.EMAIL_PROVIDER === 'brevo') {
      require('BREVO_API_KEY', 'required when EMAIL_PROVIDER=brevo');
      require('EMAIL_FROM_ADDRESS', 'required when EMAIL_PROVIDER=brevo (the sender you verified in Brevo)');
    }
    if (env.EMAIL_PROVIDER === 'resend') {
      require('RESEND_API_KEY', 'required when EMAIL_PROVIDER=resend');
      require('EMAIL_FROM_ADDRESS', 'required when EMAIL_PROVIDER=resend (an address on your verified domain)');
    }
  });

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
