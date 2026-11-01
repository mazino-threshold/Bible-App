import { config } from 'dotenv';
import { z } from 'zod';

config({ quiet: true });

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.url({ message: 'DATABASE_URL must be set to your Neon connection string' }),
  // Optional in development: without it, login codes are printed to the terminal instead of emailed
  RESEND_API_KEY: z
    .string()
    .optional()
    .transform((v) => v || undefined),
  EMAIL_FROM: z.string().min(1).default('Bible App <onboarding@resend.dev>'),
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
