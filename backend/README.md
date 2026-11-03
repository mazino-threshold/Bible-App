# Bible App – Backend

Node.js + Express + TypeScript API, PostgreSQL (Neon) via `pg` with plain SQL.

## Getting started

```
cp .env.example .env     # then fill in DATABASE_URL
npm install
npm run migrate          # create/update database tables
npm run dev              # http://localhost:4000/health
```

Make someone an admin (they must register in the app first):

```
npm run make-admin -- someone@example.com
```

## Automated tests

```
npm test            # everything (about 1.5 minutes)
npm run test:unit   # pure rules only, no database (under a second)
npm run test:api    # end-to-end against the database
```

- `tests/unit/`: streaks, day statuses, reminder slots, report filters, Nigeria time. No database.
- `tests/api/`: real HTTP calls against the app and database. They fake "today" into 2099 (`setNigeriaTime`), only create data in 2099 or with `test.` emails, and delete it afterwards.
- No real emails or pushes are sent: codes are read from the logs, and Expo is simulated.
- They use `DATABASE_URL` from `.env`, or `TEST_DATABASE_URL` if set (recommended: a separate Neon branch). They refuse to run with `NODE_ENV=production`.
- Set `TEST_LOGS=1` to see the app's logs while tests run.

## Testing the API by hand

- **Swagger UI:** http://localhost:4000/docs (raw spec at `/docs/openapi.json`). Sign in with register/request-code → verify-code, then click **Authorize** and paste the token.
- **Postman:** import `postman/bible-app.postman_collection.json`, set the `email`/`name`/`phone` collection variables, and put the emailed code in `code` before running **Verify code**. The token is saved automatically.

When adding endpoints, add them to `src/docs/openapi.ts` and the Postman collection.

## Reminders

Push reminders go out at 6, 9, 12, 15, 18 and 21 Nigeria time, Mon–Sat, to users whose frequency includes that slot (high: all, mid: 6/12/18/21, low: 6/21, off: none) and who haven't checked in today.

- The app registers each device with `POST /me/push-tokens` (an Expo push token).
- An external cron job (cron-job.org) calls `POST /internal/reminders/run` with header `X-Cron-Secret: <CRON_SECRET>` at each slot. The API works out the slot from the clock (±15 min).
- Each slot is sent at most once per day (`reminder_runs` table), so retries or double calls are safe.
- Locally, leave `CRON_SECRET` empty and send `{ "hour": 6 }` to run a slot immediately (refused in production).

## Deactivating users

Admins can deactivate someone who keeps defaulting or has left (`POST /admin/users/{id}/deactivate`, optional `reason`) and reactivate them when they come back (`POST /admin/users/{id}/reactivate`). `GET /admin/users?status=active|deactivated|all` lists everyone.

- A deactivated user is signed out on every device, their push tokens are removed, and sign-in is refused (403) until they're reactivated. Their check-ins are kept.
- Weekly reports leave out anyone deactivated for the whole of that week. Someone deactivated mid-week still shows for that week, with `active: false`.
- Every change is recorded in `user_status_changes` (who, when, reason), which is how past reports stay correct.
- An admin can't deactivate themselves.

## Logging

Use `logger` from `src/shared/logger.ts` (winston), never `console`, in app code. CLI scripts (`migrate`, `make-admin`) use `console` because their output is for the person at the terminal.

- Every log line written during a request automatically includes its `requestId`, and `userId` once signed in (`shared/request-context.ts`). No need to pass them around.
- Levels: `error` failures · `warn` refusals (wrong code, rate limit, locked week, non-admin) and slow SQL (>500ms) · `info` things that happened (registered, signed in, checked in, week saved) and finished requests · `http` request started · `debug` every SQL query with duration and row count, and query results.
- Every request is logged when it starts (`→`, at `http`) and when it finishes (`←`): method, path, status, duration. `/health` is logged at `debug` only.
- SQL is logged without its values. Personal details (name, phone) are not logged; emails are, for support.
- Every response has an `X-Request-Id` header; 500 responses also include `requestId` in the body. Search the logs for it to find the error and stack trace.
- Development prints readable coloured lines; production prints one JSON object per line.
- `LOG_LEVEL` in `.env`: `error | warn | info | debug` (default `debug` in development, `info` in production).
- Never log request bodies, tokens or login codes. Pass errors as a field: `logger.error('What failed', { error: err })`.

## Structure

Code is grouped by feature under `src/modules/`. Each module separates commands (change data) from queries (read data), and keeps HTTP, business logic and SQL in separate layers.

```
src/
  modules/
    <feature>/
      <feature>.routes.ts       URL -> middleware -> controller. Wiring only.
      <feature>.controller.ts   HTTP only: validate input with the schema, call one command/query, send the response.
      <feature>.schemas.ts      zod input validation + the input types derived from it.
      <feature>.types.ts        Row (database) and Dto (API) types.
      <feature>.mapper.ts       Row -> Dto.
      commands/*.command.ts     Business logic that changes data. One use case per file.
      queries/*.query.ts        Business logic that only reads data. One use case per file.
      data/<feature>.reads.ts   SELECT SQL only.
      data/<feature>.writes.ts  INSERT / UPDATE / DELETE SQL only.
  shared/                       Cross-cutting helpers: errors, time (Nigeria), tokens, email, validation.
  config/env.ts                 Environment variables, checked at startup.
  db/                           Connection pool and migration runner.
  scripts/                      One-off CLI tasks.
migrations/                     Numbered .sql files, applied in order by `npm run migrate`.
```

### Rules

- Controllers never contain SQL or business rules. Commands and queries never see `req` / `res`.
- SQL lives only in `data/`. Reads and writes are kept in separate files.
- Queries never write. Commands may read what they need to make a decision.
- Throw `HttpError(status, message)` for anything the app should show the user; the error handler turns it into JSON.
- "Today" always comes from `shared/time.ts` (Nigeria time), never from `new Date()` directly.
- Database changes go in a new numbered file in `migrations/`. Never edit a migration that has already been run.
