# AGENTS.md

Operating manual for coding agents working on **buzzy-finance-backend**.
Read this before making any change. Follow it over your own defaults.

## Goal

Make the smallest correct change that solves the requested task, in a way that passes `pnpm test`, `pnpm lint:eslint:check` and `pnpm lint:prettier:check`.

## What this repo is

- **Express 5 + TypeScript REST API**, API-first, versioned under `/api/v1`.
- **PostgreSQL** via `pg` (pool in `app/infra/database/database.ts`), schema
  managed by `node-pg-migrate`.
- **pnpm** is the package manager (`pnpm@10.30.0`, pinned via `packageManager`).
  Never use `npm` or `yarn`; never hand-edit `pnpm-lock.yaml`.
- **Tests are end-to-end**: Jest drives a real running server over `fetch`,
  against a real Postgres and a real SMTP catcher in Docker. There are no unit
  tests and no mocks — do not introduce mocking frameworks without asking.
- Local services (`app/infra/docker/docker-compose.yml`): Postgres dev (5432),
  Postgres test (5433), MailCatcher (SMTP 1025 / HTTP 1080).

### Layout

```
app/api/            HTTP layer
  server.ts         express app, middleware, 404 handler
  config/consts.ts  env-derived config
  utils/logger.ts   pino logger (use this, never console.log)
  v1/index.ts       mounts the v1 routers
  v1/<feature>/     route.ts | controller.ts | model.ts | types.ts | consts.ts | helpers.ts
  v1/utils.ts       catchNotAllowedMethods, handleUnexpectedError
app/infra/          non-HTTP concerns
  auth/             authManager (bcrypt), authorization (permissions), activation
  database/         pool + DB.query
  email/            nodemailer mailManager
  errors/           BaseError + typed subclasses
  migrations/       node-pg-migrate files
  scripts/          waitForPostgres, waitForServices
app/tests/v1/api/   the e2e suite (this is what jest runs)
```

Path aliases: `api/*` → `app/api/*`, `infra/*` → `app/infra/*` (tsconfig +
`moduleDirectories` in jest). Use them for cross-layer imports; use relative
imports inside a feature folder.

## Commands

| Task                                  | Command                                             |
| ------------------------------------- | --------------------------------------------------- |
| Run dev API (dev env)                 | `pnpm dev`                                          |
| Run dev API against test env          | `pnpm dev:test`                                     |
| Run the full e2e suite                | `pnpm test`                                         |
| Watch tests (server must already run) | `pnpm watch`                                        |
| Type-check / build                    | `pnpm build`                                        |
| Lint                                  | `pnpm lint:eslint:check`                            |
| Format / check format                 | `pnpm lint:prettier` / `pnpm lint:prettier:check`   |
| New migration                         | `pnpm migrate:create <name>`                        |
| Apply / revert migrations             | `pnpm migrate:up` / `pnpm migrate:down`             |
| Docker services                       | `pnpm compose:up` / `compose:stop` / `compose:down` |

`pnpm test` boots Docker, starts the API with `.env.test`, and runs Jest with
`--runInBand`. It needs Docker running. If you cannot run it, say so — do not
claim tests passed.

## Defaults

- Stay within the requested scope. One feature or fix per change.
- Prefer the simplest working fix over a rewrite.
- Match the existing structure exactly: a new endpoint means a new
  `app/api/v1/<feature>/` folder with `route.ts`, `controller.ts`, `model.ts`,
  `types.ts`, and SQL in `consts.ts` — then mount it in `app/api/v1/index.ts`.
- Do not edit unrelated files because they could be improved.
- Do not add dependencies without asking; prefer the stdlib or what is installed.
- Do not invent endpoints, env vars, config keys, or test results.
- Ask before destructive or irreversible actions (dropping tables, editing an
  already-applied migration, `compose:down -v`, rewriting git history).

## Code conventions

- **Layering is strict.** `route` wires paths → `controller` handles HTTP →
  `model` owns SQL and business rules. Controllers never write SQL; models never
  touch `Request`/`Response`.
- **Every controller** wraps its body in `try/catch` and returns
  `handleUnexpectedError(err, response)`. Every `.route()` chain ends with
  `.all(catchNotAllowedMethods)`.
- **Errors**: throw a subclass of `BaseError` from `app/infra/errors/`
  (`ValidationError` 422, `NotFoundError`, `UnauthorizedError`, `PermissionError`,
  `ServiceUnavailableError`, `MethodNotAllowed`, `InternalServerError`). Never
  `response.status(500)` by hand, and never invent a new status code shape.
  If you need a new error kind, add a `BaseError` subclass rather than an ad-hoc object.
- **SQL** lives in `consts.ts` as named `*_STATEMENT` constants and is always
  parameterized (`$1, $2`). String interpolation into SQL is never acceptable.
- **DB access** goes through `DB.query` from `infra/database/database`. Release
  clients in a `finally` when you connect directly from the pool.
- **Models** export a default object of functions (see `userModel`).
- **All API schemas and types live in the feature's `types.ts`** — every
  `Request`/`Response` alias, every `*RequestBody` / `*ResponseBody`, every entity
  and param type. Never declare an inline type or an ad-hoc object shape in a
  `route.ts`, `controller.ts`, `model.ts`, or `helpers.ts`; if a type is missing,
  add it to `types.ts` and import it. Keep responses explicit — never spread a DB
  row straight into a response; `password` and `id` must not leak.
- Dates cross the wire as ISO strings (`.toISOString()`); columns are `timestamptz`.
- **Logging** uses the pino `logger`. No `console.log`.
- TypeScript is `strict` with `noUncheckedIndexedAccess`. Do not silence it with
  `as any` or `@ts-ignore`; `no-explicit-any` is off, but new `any` still needs a reason.
- Formatting is Prettier (120 cols, 2 spaces, LF). Run it rather than hand-aligning.
- **Do not write comments unless strictly necessary.** Code, type names, and
  function names carry the meaning. A comment is justified only for something the
  code cannot say: a non-obvious constraint, a workaround and why it exists, or a
  contract mirrored from outside this repo. Never narrate what the next line does,
  and never leave behind commented-out code or TODOs.

## Migrations

- Create with `pnpm migrate:create <name>`; never rename or edit a migration
  that has already been applied or committed — add a new one.
- Follow the existing style: `timestamptz` columns, `gen_random_uuid()` defaults,
  `created_at` / `updated_at` defaulting to `timezone('utc', now())`.
- Existing migrations set `export const down = false`. Keep that unless the task
  is explicitly about making a migration reversible.
- Schema changes almost always need a matching e2e test.

## Tests

- Suite lives in `app/tests/v1/api/**/*.test.ts` — that is the only path Jest
  matches. A test placed elsewhere (e.g. a top-level `tests/`) will silently not run.
- Tests hit the real API over `fetch` using helpers in `app/tests/v1/api/utils.ts`
  (`createUser`, `loginUser`, `activateUser`, `applyMigrations`, `cleanDatabase`,
  `extractSessionCookie`, `getLastEmail`, ...). Add new helpers there rather than
  re-implementing fetch calls per test.
- Standard shape: `beforeAll(waitForServices)`, then per-test
  `cleanDatabase(client)` + `applyMigrations()`. Tests share one database and run
  `--runInBand`, so always reset state instead of relying on ordering.
- Assert on status code _and_ body shape, including fields that must be absent
  (`not.toHaveProperty("password")`).
- Email flows are asserted through MailCatcher (`getLastEmail`, `deleteAllEmails`).
- **A failing test is a stop sign.** When a test breaks, do not change the code or
  the test to make it pass. Report it first: which test, the actual assertion
  failure, what you believe caused it, and whether the bug is in the code or in
  the test's expectation. Then ask which one should change. Never delete, skip,
  `.only`, loosen an assertion, or raise a timeout to get a green run.

## Environment

- `.env.development`, `.env.test`, `.env.prod` are gitignored and not in the repo.
  CI writes `.env.test` from the `TEST_ENV` secret.
- Keys in use: `POSTGRES_`\*, `DATABASE_URL`, `NODE_ENV`, `BASE_URL`, `WEBAPP_URL`,
  `SALT_ROUNDS`, `APP_SECRET`, `SMTP_HOST`, `SMTP_PORT`, `EMAIL_HTTP_HOST`,
  `EMAIL_HTTP_PORT`, `EMAIL_SENDER`.
- Never print, commit, or send secret values. If a task needs a new env var, add
  it to the list here and tell the user to set it in all three env files.

## Git

- Conventional Commits, enforced by commitlint on `commit-msg`
  (`feat:`, `fix:`, `chore:`, ...).
- `pre-commit` runs `pnpm test`, `pnpm lint:prettier`, `pnpm lint:eslint:check`.
  Do not use `--no-verify`.
- Branch naming in use: `M2I27-user-model-and-user-migration` (ticket id + slug).
- Work on a branch, never commit directly to `main`. Commit or push only when asked.
- CI (`.github/workflows/ci.yaml`) runs build → e2e tests → prettier → eslint on
  every PR. A change is not done until those four would pass.

## Working style

- **Never assume — ask.** If the request is ambiguous, underspecified, or open to
  more than one reading, stop and ask before writing code. A wrong assumption
  delivered confidently costs far more than one clarifying question.
- Elaborate and refine the idea with the user first: restate the task in concrete
  terms, propose the shape of the solution, and get agreement before implementing.
- Surface any assumption you could not avoid, at the moment you make it — do not
  bury it in the diff.
- Keep diffs small and reviewable; explain what changed and why, in plain language.
- Stop and ask if the task turns into a refactor, a redesign, or a schema migration
  that was not requested.

## Uncertainty

- Say "I found the bug" only when you verified it. Otherwise say it is a theory.
- Prefer "I need to verify X" over guessing.
- When two reasonable paths exist with different product consequences, present
  the trade-off instead of silently picking one.

## Escalation — ask first

- Changing or removing a public API contract (route path, status code, response body).
- Editing an applied migration, dropping a column/table, or any data-destructive SQL.
- Touching auth, permissions (`app/infra/auth/authorization.ts`), session cookies,
  or password hashing.
- Adding a dependency, a build step, or a new top-level directory.
- Anything that would make the e2e suite slower or non-deterministic.

## Memory

- `CONTEXT.MD` at the repo root holds longer-lived project context — read it when
  it is non-empty, and keep it updated rather than scattering notes.
- If a session ends mid-task, write down where it stopped and what comes next
  instead of leaving the branch to be re-derived.
- Treat decisions the user has already made in this repo as constraints, not
  suggestions — do not re-propose a rejected approach later in the session.

## Guardrails

- Never hide uncertainty behind polished wording.
- Never claim a command ran or passed if it did not.
- Never change a public contract without calling it out.
- Never mix requested work with opportunistic cleanup.
