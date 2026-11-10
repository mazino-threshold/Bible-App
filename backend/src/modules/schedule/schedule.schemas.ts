import { z } from 'zod';
import { isoDayOfWeek } from '../../shared/time';
import { dateField } from '../../shared/validation';
import { parsePassage } from '../passages/passage-parser';

export const weekStartParams = z.object({
  weekStart: dateField.refine((d) => isoDayOfWeek(d) === 1, 'weekStart must be a Monday'),
});

const dayReading = z.object(
  {
    passage: z
      .string({ error: 'Enter the passage' })
      .trim()
      .min(1, 'Enter the passage')
      .max(500)
      // Must be something the app can fetch the Bible text for, e.g. "Genesis 1-3" or "Psalm 23; Proverbs 3"
      .superRefine((passage, ctx) => {
        const parsed = parsePassage(passage);
        if (!parsed.ok) ctx.addIssue({ code: 'custom', message: parsed.error });
      }),
    notes: z.string().trim().max(2000).optional(),
  },
  { error: "Enter this day's reading" },
);

/** The admin's weekly form: all six days are required. */
export const saveWeekSchema = z.object({
  monday: dayReading,
  tuesday: dayReading,
  wednesday: dayReading,
  thursday: dayReading,
  friday: dayReading,
  saturday: dayReading,
});

export type SaveWeekInput = z.infer<typeof saveWeekSchema>;
