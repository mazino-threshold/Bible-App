import { z } from 'zod';

const dayCount = z.coerce
  .number({ error: 'Must be a number from 0 to 6' })
  .int('Must be a whole number')
  .min(0, 'Must be 0 or more')
  .max(6, 'Must be 6 or less');

/** ?minDays=4&maxDays=5 : both optional, inclusive. */
export const reportFiltersSchema = z
  .object({
    minDays: dayCount.optional(),
    maxDays: dayCount.optional(),
  })
  .refine((f) => f.minDays === undefined || f.maxDays === undefined || f.minDays <= f.maxDays, {
    message: 'minDays cannot be more than maxDays',
    path: ['minDays'],
  });

export type ReportFilters = z.infer<typeof reportFiltersSchema>;
