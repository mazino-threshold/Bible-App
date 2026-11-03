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

/** ?status=active|deactivated|all (default all) */
export const listUsersSchema = z.object({
  status: z.enum(['active', 'deactivated', 'all']).default('all'),
});

export type ListUsersInput = z.infer<typeof listUsersSchema>;

export const userIdParams = z.object({
  id: z.uuid('Not a valid user id'),
});

/** Body of deactivate / reactivate. The reason is optional, e.g. "Missed 3 weeks" or "Moved away". */
export const statusChangeSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export type StatusChangeInput = z.infer<typeof statusChangeSchema>;
