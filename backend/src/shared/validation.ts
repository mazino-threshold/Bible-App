import { z } from 'zod';

export const emailField = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address'));

export const nameField = z.string().trim().min(2, 'Enter your name').max(100);

export const phoneField = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ()-]{7,20}$/, 'Enter a valid phone number');

/** A real calendar date in 'YYYY-MM-DD' form. */
export const dateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD')
  .refine((d) => {
    // Rejects dates like 2026-02-30, which JS would otherwise roll over to March
    const time = Date.parse(`${d}T00:00:00Z`);
    return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === d;
  }, 'Not a real date');
