import { z } from 'zod';

export const pushTokenSchema = z.object({
  // What expo-notifications' getExpoPushTokenAsync() returns, e.g. ExponentPushToken[xxxxxxxx]
  token: z
    .string()
    .trim()
    .regex(/^Expo(nent)?PushToken\[.+\]$/, 'Not a valid Expo push token'),
});

export type PushTokenInput = z.infer<typeof pushTokenSchema>;
