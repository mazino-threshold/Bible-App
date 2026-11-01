import { z } from 'zod';
import { emailField, nameField, phoneField } from '../../shared/validation';

export const registerSchema = z.object({
  name: nameField,
  email: emailField,
  phone: phoneField,
});

export const requestCodeSchema = z.object({
  email: emailField,
});

export const verifyCodeSchema = z.object({
  email: emailField,
  code: z.string().trim().regex(/^\d{6}$/, 'The code is 6 digits'),
});

export const logoutSchema = z.object({
  // The device's push token, so it stops getting reminders after sign-out
  pushToken: z.string().min(1).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type RequestCodeInput = z.infer<typeof requestCodeSchema>;
export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
