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

## Testing the API

- **Swagger UI:** http://localhost:4000/docs (raw spec at `/docs/openapi.json`). Sign in with register/request-code → verify-code, then click **Authorize** and paste the token.
- **Postman:** import `postman/bible-app.postman_collection.json`, set the `email`/`name`/`phone` collection variables, and put the emailed code in `code` before running **Verify code**. The token is saved automatically.

When adding endpoints, add them to `src/docs/openapi.ts` and the Postman collection.

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
