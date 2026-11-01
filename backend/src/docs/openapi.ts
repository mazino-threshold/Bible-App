// OpenAPI spec for Swagger UI (/docs). Request bodies are generated from the same zod schemas
// the API validates with, so the docs stay in sync. Add new endpoints to `paths` as modules are built.
import { z } from 'zod';
import { logoutSchema, registerSchema, requestCodeSchema, verifyCodeSchema } from '../modules/auth/auth.schemas';
import { saveWeekSchema } from '../modules/schedule/schedule.schemas';
import { updateProfileSchema } from '../modules/users/users.schemas';

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
const todayCheckInResponse = (description: string) => jsonResponse(description, ref('TodayCheckIn'));
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
          400: errorResponse('Invalid input, not a Monday, or the week has ended'),
          401: errorResponse('Not signed in'),
          403: errorResponse('Not an admin'),
        },
      },
    },
  },
};
