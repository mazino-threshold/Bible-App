// OpenAPI spec for Swagger UI (/docs). Request bodies are generated from the same zod schemas
// the API validates with, so the docs stay in sync. Add new endpoints to `paths` as modules are built.
import { z } from 'zod';
import { logoutSchema, registerSchema, requestCodeSchema, verifyCodeSchema } from '../modules/auth/auth.schemas';
import { pushTokenSchema } from '../modules/push/push.schemas';
import { runRemindersSchema } from '../modules/reminders/reminders.schemas';
import { saveWeekSchema } from '../modules/schedule/schedule.schemas';
import { statusChangeSchema, updateProfileSchema } from '../modules/users/users.schemas';

function schemaOf(zodSchema: z.ZodType) {
  const { $schema, ...jsonSchema } = z.toJSONSchema(zodSchema, { io: 'input' });
  return jsonSchema;
}

function jsonBody(zodSchema: z.ZodType, example: object) {
  return { required: true, content: { 'application/json': { schema: schemaOf(zodSchema), example } } };
}

function jsonResponse(description: string, schema: object) {
  return { description, content: { 'application/json': { schema } } };
}

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const errorResponse = (description: string) => jsonResponse(description, ref('Error'));
const message = { type: 'object', properties: { message: { type: 'string' } } };
const signedIn = [{ bearerAuth: [] }];
const weekStartParam = {
  name: 'weekStart',
  in: 'path',
  required: true,
  description: 'The Monday that starts the week (YYYY-MM-DD)',
  schema: { type: 'string', example: '2026-11-02' },
};
const weekResponse = (description: string) =>
  jsonResponse(description, { type: 'object', properties: { week: ref('Week') } });
const dayExample = (passage: string) => ({ passage, notes: 'Optional notes' });
const reportFilterParams = [
  {
    name: 'minDays',
    in: 'query',
    required: false,
    description: 'Only users who read at least this many days (0-6)',
    schema: { type: 'integer', minimum: 0, maximum: 6 },
  },
  {
    name: 'maxDays',
    in: 'query',
    required: false,
    description: 'Only users who read at most this many days (0-6)',
    schema: { type: 'integer', minimum: 0, maximum: 6 },
  },
];
const userIdParam = {
  name: 'id',
  in: 'path',
  required: true,
  description: "The user's id",
  schema: { type: 'string', format: 'uuid' },
};
const adminUserResponse = (description: string) =>
  jsonResponse(description, { type: 'object', properties: { user: ref('AdminUser') } });
const reportResponse = jsonResponse('The weekly report', { type: 'object', properties: { report: ref('WeeklyReport') } });
const todayCheckInResponse =(description: string) => jsonResponse(description, ref('TodayCheckIn'));
const myWeekResponse = jsonResponse("The week with this user's status for each day", {
  type: 'object',
  properties: { week: ref('MyWeek') },
});

export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Bible App API',
    version: '1.0.0',
    description:
      'To sign in: **register** (or **request-code**), get the 6-digit code from your email, then **verify-code**. ' +
      'Copy the `token` from the response, click **Authorize** above and paste it.',
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', description: 'The token returned by /auth/verify-code' },
      cronSecret: {
        type: 'apiKey',
        in: 'header',
        name: 'X-Cron-Secret',
        description: 'CRON_SECRET from .env. Not needed in development if CRON_SECRET is empty',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          details: {
            type: 'array',
            items: { type: 'object', properties: { field: { type: 'string' }, message: { type: 'string' } } },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          role: { type: 'string', enum: ['user', 'admin'] },
          reminderFrequency: { type: 'string', enum: ['high', 'mid', 'low', 'off'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      CommunityLink: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          platform: { type: 'string', description: "Which app the link opens, e.g. 'whatsapp' or 'telegram'" },
          title: { type: 'string' },
          description: { type: 'string' },
          buttonLabel: { type: 'string' },
          url: { type: 'string', format: 'uri' },
        },
      },
      AdminUser: {
        allOf: [
          ref('User'),
          {
            type: 'object',
            properties: {
              active: { type: 'boolean' },
              deactivatedAt: { type: ['string', 'null'], format: 'date-time' },
              deactivationReason: { type: ['string', 'null'] },
            },
          },
        ],
      },
      Week: {
        type: 'object',
        properties: {
          weekStart: { type: 'string', example: '2026-11-02' },
          weekEnd: { type: 'string', example: '2026-11-07' },
          days: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                date: { type: 'string', example: '2026-11-02' },
                day: { type: 'string', enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] },
                passage: { type: ['string', 'null'], description: 'null if not scheduled yet' },
                notes: { type: ['string', 'null'] },
              },
            },
          },
        },
      },
      WeeklyReport: {
        type: 'object',
        properties: {
          weekStart: { type: 'string' },
          weekEnd: { type: 'string' },
          daysScheduled: { type: 'integer', description: 'Days with a reading this week (normally 6)' },
          summary: {
            type: 'object',
            description: 'Totals over everyone, before filters',
            properties: {
              totalUsers: { type: 'integer' },
              readEveryDay: { type: 'integer' },
              averageDaysRead: { type: 'number' },
            },
          },
          filters: {
            type: 'object',
            properties: { minDays: { type: ['integer', 'null'] }, maxDays: { type: ['integer', 'null'] } },
          },
          users: {
            type: 'array',
            description:
              'Most days read first, then by name. Includes admins. Leaves out anyone who was deactivated for the whole week.',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string', enum: ['user', 'admin'] },
                active: { type: 'boolean', description: 'Active now. Someone deactivated mid-week still appears for that week' },
                daysRead: { type: 'integer' },
                checkedInDates: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
      TodayCheckIn: {
        type: 'object',
        properties: {
          date: { type: 'string', description: "Today's date in Nigeria" },
          checkedIn: { type: 'boolean' },
          streak: { type: 'integer' },
        },
      },
      MyWeek: {
        type: 'object',
        properties: {
          today: { type: 'string' },
          weekStart: { type: 'string' },
          weekEnd: { type: 'string' },
          daysRead: { type: 'integer', description: 'Out of 6' },
          streak: { type: 'integer' },
          days: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                date: { type: 'string' },
                day: { type: 'string' },
                passage: { type: ['string', 'null'] },
                notes: { type: ['string', 'null'] },
                status: {
                  type: 'string',
                  enum: ['read', 'pending', 'missed', 'upcoming', 'no_reading'],
                  description:
                    'read = checked in; pending = today, not yet; missed = past day not checked in; upcoming = future day; no_reading = nothing scheduled',
                },
                canToggle: { type: 'boolean', description: 'True only for today when it has a reading' },
              },
            },
          },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Check the API and database are up',
        responses: {
          200: jsonResponse('OK', {
            type: 'object',
            properties: { status: { type: 'string' }, today: { type: 'string', description: "Today's date in Nigeria" } },
          }),
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Create an account and email a login code',
        requestBody: jsonBody(registerSchema, { name: 'Ada Obi', email: 'ada@example.com', phone: '+234 803 000 0000' }),
        responses: {
          201: jsonResponse('Account created, code emailed', message),
          400: errorResponse('Invalid input'),
          409: errorResponse('Email already registered'),
          429: errorResponse('Code requested too recently'),
        },
      },
    },
    '/auth/request-code': {
      post: {
        tags: ['Auth'],
        summary: 'Email a login code to an existing user',
        requestBody: jsonBody(requestCodeSchema, { email: 'ada@example.com' }),
        responses: {
          200: jsonResponse('Code emailed', message),
          403: errorResponse('Account deactivated'),
          404: errorResponse('No account with this email'),
          429: errorResponse('Max 1 code per minute, 5 per hour'),
        },
      },
    },
    '/auth/verify-code': {
      post: {
        tags: ['Auth'],
        summary: 'Exchange the emailed code for a sign-in token',
        requestBody: jsonBody(verifyCodeSchema, { email: 'ada@example.com', code: '123456' }),
        responses: {
          200: jsonResponse('Signed in', {
            type: 'object',
            properties: { token: { type: 'string' }, user: ref('User') },
          }),
          400: errorResponse('Incorrect, expired or locked code'),
          403: errorResponse('Account deactivated'),
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Sign out this device',
        security: signedIn,
        requestBody: { ...jsonBody(logoutSchema, {}), required: false },
        responses: { 204: { description: 'Signed out' }, 401: errorResponse('Not signed in') },
      },
    },
    '/me': {
      get: {
        tags: ['Profile'],
        summary: "The signed-in user's profile",
        security: signedIn,
        responses: {
          200: jsonResponse('Profile', { type: 'object', properties: { user: ref('User') } }),
          401: errorResponse('Not signed in'),
        },
      },
      patch: {
        tags: ['Profile'],
        summary: 'Update name, phone or reminder frequency (only the fields sent change)',
        security: signedIn,
        requestBody: jsonBody(updateProfileSchema, { reminderFrequency: 'high' }),
        responses: {
          200: jsonResponse('Updated profile', { type: 'object', properties: { user: ref('User') } }),
          400: errorResponse('Invalid input'),
          401: errorResponse('Not signed in'),
        },
      },
    },
    '/me/push-tokens': {
      post: {
        tags: ['Profile'],
        summary: "Register this device for reminders (the app calls this after sign-in). Safe to repeat",
        security: signedIn,
        requestBody: jsonBody(pushTokenSchema, { token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' }),
        responses: {
          204: { description: 'Registered' },
          400: errorResponse('Not a valid Expo push token'),
          401: errorResponse('Not signed in'),
        },
      },
      delete: {
        tags: ['Profile'],
        summary: 'Stop reminders to this device',
        security: signedIn,
        requestBody: jsonBody(pushTokenSchema, { token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' }),
        responses: { 204: { description: 'Removed' }, 401: errorResponse('Not signed in') },
      },
    },
    '/internal/reminders/run': {
      post: {
        tags: ['Internal: Reminders'],
        summary: 'Send push reminders for the current slot (called by cron-job.org at 6, 9, 12, 15, 18, 21 Nigeria time)',
        description:
          'Works out the slot from Nigeria time (±15 min). Skips Sundays, days with no reading, and slots already sent today. ' +
          'Only users whose reminder frequency includes this slot and who have not checked in today are reminded. ' +
          'Outside production you can send `{ "hour": 6 }` to run a slot now.',
        security: [{ cronSecret: [] }],
        requestBody: { ...jsonBody(runRemindersSchema, {}), required: false },
        responses: {
          200: jsonResponse('What happened', {
            type: 'object',
            properties: {
              run: {
                type: 'object',
                properties: {
                  date: { type: 'string' },
                  hour: { type: ['integer', 'null'] },
                  status: { type: 'string', enum: ['sent', 'skipped'] },
                  reason: { type: 'string', description: 'Why nothing was sent, when skipped' },
                  users: { type: 'integer' },
                  devices: { type: 'integer' },
                  sent: { type: 'integer' },
                  failed: { type: 'integer' },
                  invalidTokensRemoved: { type: 'integer' },
                },
              },
            },
          }),
          400: errorResponse('Invalid hour, or hour override used in production'),
          401: errorResponse('Missing or wrong X-Cron-Secret'),
        },
      },
    },
    '/internal/passage-cache/clear': {
      post: {
        tags: ['Internal: Passages'],
        summary: 'Empty the Bible text cache of every day before today (called by cron-job.org every Sunday)',
        description: 'On Sunday that is the whole week. Safe to call on any day or more than once.',
        security: [{ cronSecret: [] }],
        responses: {
          200: jsonResponse('What was cleared', {
            type: 'object',
            properties: { date: { type: 'string' }, daysCleared: { type: 'integer' } },
          }),
          401: errorResponse('Missing or wrong X-Cron-Secret'),
        },
      },
    },
    '/schedule/current': {
      get: {
        tags: ['Schedule'],
        summary: "This week's readings (on Sunday, the week that just ended)",
        security: signedIn,
        responses: { 200: weekResponse("This week's readings"), 401: errorResponse('Not signed in') },
      },
    },
    '/schedule/weeks/{weekStart}': {
      get: {
        tags: ['Schedule'],
        summary: 'Readings for any week',
        security: signedIn,
        parameters: [weekStartParam],
        responses: {
          200: weekResponse('The week'),
          400: errorResponse('weekStart is not a Monday'),
          401: errorResponse('Not signed in'),
        },
      },
    },
    '/passages/today': {
      get: {
        tags: ['Passages'],
        summary: "Today's reading in full (every chapter), from YouVersion. Today is decided by the server, Nigeria time",
        description:
          'The first request of the day fetches the text from YouVersion and saves it; later requests are served from the database ' +
          "(the cache is cleared every Sunday). If the admin changes today's reading, the new text is fetched on the next request.\n\n" +
          "`html` is YouVersion's Bible HTML (verse numbers, headings, poetry indents). Style it with " +
          "`https://cdn.youversion.com/platform/1/bible.css`. **Always show `version.copyright` with the text** (publisher's licence).",
        security: signedIn,
        responses: {
          200: jsonResponse("Today's Bible text", {
            type: 'object',
            properties: {
              passage: {
                type: 'object',
                properties: {
                  date: { type: 'string', example: '2026-11-07' },
                  passage: { type: 'string', example: 'Genesis 16-18', description: 'The reading as the admin entered it' },
                  notes: { type: ['string', 'null'] },
                  version: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer', example: 111 },
                      abbreviation: { type: 'string', example: 'NIV' },
                      title: { type: 'string', example: 'New International Version 2011' },
                      copyright: { type: 'string', description: 'Must be shown with the text' },
                    },
                  },
                  chapters: {
                    type: 'array',
                    description: 'In reading order: one per chapter',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', example: 'GEN.16' },
                        reference: { type: 'string', example: 'Genesis 16' },
                        html: { type: 'string', example: '<div><div class="s1">Hagar and Ishmael</div><div class="p"><span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>Now Sarai...</div></div>' },
                      },
                    },
                  },
                  fetchedAt: { type: 'string', format: 'date-time', description: 'When the text was fetched from YouVersion' },
                },
              },
            },
          }),
          401: errorResponse('Not signed in'),
          404: errorResponse('Sunday, or no reading scheduled today'),
          422: errorResponse("Today's reading couldn't be understood, or isn't in this Bible version"),
          503: errorResponse('YouVersion could not be reached; try again later'),
        },
      },
    },
    '/check-ins/today': {
      post: {
        tags: ['Check-ins'],
        summary: "Tick today's reading (today is decided by the server, Nigeria time). Safe to call twice",
        security: signedIn,
        responses: {
          200: todayCheckInResponse('Checked in'),
          400: errorResponse("Sunday, or no reading scheduled today"),
          401: errorResponse('Not signed in'),
        },
      },
      delete: {
        tags: ['Check-ins'],
        summary: "Untick today's reading. Only today can be undone",
        security: signedIn,
        responses: {
          200: todayCheckInResponse('Check-in removed'),
          400: errorResponse("Sunday, or no reading scheduled today"),
          401: errorResponse('Not signed in'),
        },
      },
    },
    '/check-ins/week': {
      get: {
        tags: ['Check-ins'],
        summary: "This week's readings with my status for each day, plus my streak",
        security: signedIn,
        responses: { 200: myWeekResponse, 401: errorResponse('Not signed in') },
      },
    },
    '/check-ins/weeks/{weekStart}': {
      get: {
        tags: ['Check-ins'],
        summary: 'Any week with my status for each day',
        security: signedIn,
        parameters: [weekStartParam],
        responses: {
          200: myWeekResponse,
          400: errorResponse('weekStart is not a Monday'),
          401: errorResponse('Not signed in'),
        },
      },
    },
    '/community': {
      get: {
        tags: ['Community'],
        summary: "Links to the club's community groups (e.g. WhatsApp), in display order. Empty if there are none",
        security: signedIn,
        responses: {
          200: jsonResponse('The active community links', {
            type: 'object',
            properties: { links: { type: 'array', items: ref('CommunityLink') } },
          }),
          401: errorResponse('Not signed in'),
        },
      },
    },
    '/admin/reports/weekly/current': {
      get: {
        tags: ['Admin: Reports'],
        summary: "This week's report (on Sunday, the week that just ended)",
        security: signedIn,
        parameters: reportFilterParams,
        responses: {
          200: reportResponse,
          400: errorResponse('Invalid filters'),
          401: errorResponse('Not signed in'),
          403: errorResponse('Not an admin'),
        },
      },
    },
    '/admin/reports/weekly/{weekStart}': {
      get: {
        tags: ['Admin: Reports'],
        summary: "Any week's report",
        security: signedIn,
        parameters: [weekStartParam, ...reportFilterParams],
        responses: {
          200: reportResponse,
          400: errorResponse('Invalid filters or weekStart is not a Monday'),
          401: errorResponse('Not signed in'),
          403: errorResponse('Not an admin'),
        },
      },
    },
    '/admin/users': {
      get: {
        tags: ['Admin: Users'],
        summary: 'Everyone, by name, with whether they are active',
        security: signedIn,
        parameters: [
          {
            name: 'status',
            in: 'query',
            required: false,
            description: 'Default all',
            schema: { type: 'string', enum: ['active', 'deactivated', 'all'] },
          },
        ],
        responses: {
          200: jsonResponse('Users', { type: 'object', properties: { users: { type: 'array', items: ref('AdminUser') } } }),
          400: errorResponse('Invalid status'),
          401: errorResponse('Not signed in'),
          403: errorResponse('Not an admin'),
        },
      },
    },
    '/admin/users/{id}/deactivate': {
      post: {
        tags: ['Admin: Users'],
        summary: 'Deactivate a user (e.g. defaulting, or has left). Safe to call twice',
        description:
          'Signs them out on every device and stops their reminders. They cannot sign in until reactivated. ' +
          'Their check-ins are kept. They are left out of weekly reports for weeks they were deactivated throughout.',
        security: signedIn,
        parameters: [userIdParam],
        requestBody: { ...jsonBody(statusChangeSchema, { reason: 'Missed three weeks in a row' }), required: false },
        responses: {
          200: adminUserResponse('The deactivated user'),
          400: errorResponse('Invalid id, or trying to deactivate yourself'),
          401: errorResponse('Not signed in'),
          403: errorResponse('Not an admin'),
          404: errorResponse('No such user'),
        },
      },
    },
    '/admin/users/{id}/reactivate': {
      post: {
        tags: ['Admin: Users'],
        summary: 'Let a deactivated user back in. Safe to call twice',
        description: 'They sign in again with an emailed code as usual.',
        security: signedIn,
        parameters: [userIdParam],
        requestBody: { ...jsonBody(statusChangeSchema, { reason: 'Back from travel' }), required: false },
        responses: {
          200: adminUserResponse('The reactivated user'),
          400: errorResponse('Invalid id'),
          401: errorResponse('Not signed in'),
          403: errorResponse('Not an admin'),
          404: errorResponse('No such user'),
        },
      },
    },
    '/admin/schedule/weeks': {
      get: {
        tags: ['Admin: Schedule'],
        summary: 'Weeks that have readings, newest first',
        security: signedIn,
        responses: {
          200: jsonResponse('Scheduled weeks', {
            type: 'object',
            properties: {
              weeks: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    weekStart: { type: 'string' },
                    weekEnd: { type: 'string' },
                    daysScheduled: { type: 'integer', description: 'How many of the 6 days have a reading' },
                  },
                },
              },
            },
          }),
          401: errorResponse('Not signed in'),
          403: errorResponse('Not an admin'),
        },
      },
    },
    '/admin/schedule/weeks/{weekStart}': {
      put: {
        tags: ['Admin: Schedule'],
        summary: "Create or replace a week's readings (all six days). Weeks that have ended are locked",
        security: signedIn,
        parameters: [weekStartParam],
        requestBody: jsonBody(saveWeekSchema, {
          monday: dayExample('Genesis 1-3'),
          tuesday: dayExample('Genesis 4-6'),
          wednesday: dayExample('Genesis 7-9'),
          thursday: dayExample('Genesis 10-12'),
          friday: dayExample('Genesis 13-15'),
          saturday: dayExample('Genesis 16-18'),
        }),
        responses: {
          200: weekResponse('Saved week'),
          400: errorResponse(`Invalid input (including a passage the app can't read, e.g. "Genisis 1"), not a Monday, or the week has ended`),
          401: errorResponse('Not signed in'),
          403: errorResponse('Not an admin'),
        },
      },
    },
  },
};
