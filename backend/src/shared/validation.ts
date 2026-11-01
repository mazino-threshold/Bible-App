import { z } from 'zod';

export const emailField = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address'));

export const nameField = z.string().trim().min(2, 'Enter your name').max(100);

export const phoneField = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ()-]{7,20}$/, 'Enter a valid phone number');
