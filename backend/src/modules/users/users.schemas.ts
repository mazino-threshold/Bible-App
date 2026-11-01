import { z } from 'zod';
import { nameField, phoneField } from '../../shared/validation';

export const updateProfileSchema = z
  .object({
    name: nameField,
    phone: phoneField,
    reminderFrequency: z.enum(['high', 'mid', 'low', 'off']),
  })
  .partial();

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
