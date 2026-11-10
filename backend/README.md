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

## Bible text (YouVersion)

`GET /passages/today` returns today's reading in full: every chapter, as YouVersion HTML (verse numbers, headings), with the version's copyright notice.

- The text comes from the [YouVersion Platform API](https://developers.youversion.com/api/bibles), set by `YOUVERSION_APP_KEY` and `YOUVERSION_BIBLE_ID` (default 111 = NIV, which needs the Biblica Fast-track licence accepted in the Platform portal; 3034 = Berean Standard Bible needs none).
- **Cache:** the first request of the day fetches it (one YouVersion call per chapter) and saves it in `passage_cache`; every request after that is served from the database. It's in the database, not memory, because Render's free plan restarts the server when idle. If the admin changes today's reading, the new text is fetched on the next request.
- **Sunday clear:** a cron-job.org job calls `POST /internal/passage-cache/clear` with `X-Cron-Secret` every Sunday (e.g. 23:00 Nigeria time). If it's ever missed, last week's rows are removed anyway the next time a day is cached.
- The admin's weekly form only accepts passages the app can fetch, e.g. `Genesis 1-3`, `Psalm 23; Proverbs 3`, `John 3:1-21`, `Genesis 50 - Exodus 2`, `Jude`. Abbreviations like `Gen`, `1 Cor` and `Ps` work. At most 15 chapters a day.
- The app must style the HTML with `https://cdn.youversion.com/platform/1/bible.css` and always show `version.copyright` with the text.
- Tests never call YouVersion: it's simulated in `tests/helpers/harness.ts`.

## Community links

The home screen shows a card for each active row in `community_links` (`GET /community`, signed-in users only). There's no admin screen yet, so change them in the database:

```sql
-- Change the WhatsApp link
UPDATE community_links SET url = 'https://chat.whatsapp.com/NEW', updated_at = now() WHERE platform = 'whatsapp';

-- Move to another platform: add the new link and retire the old one
INSERT INTO community_links (platform, title, description, button_label, url)
VALUES ('telegram', 'Join our community', 'Have questions while you read Scripture or want an accountability community? Join our community.', 'Join on Telegram', 'https://t.me/...');
UPDATE community_links SET active = false WHERE platform = 'whatsapp';
```

`platform` only picks the icon in the app (`whatsapp`, `telegram` and `discord` have their own; anything else gets a generic one). URLs must start with `https://`.

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
