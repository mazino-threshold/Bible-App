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
