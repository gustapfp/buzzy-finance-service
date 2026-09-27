# AGENTS.md

Operating manual for coding agents working on **buzzy-finance-backend**.
Read this before making any change. Follow it over your own defaults.

## Goal

Make the smallest correct change that solves the requested task, in a way that passes `pnpm test`, `pnpm lint:eslint:check` and `pnpm lint:prettier:check`.

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

## Build & run

- `pnpm build` is two steps: `tsc` compiles to `dist/`, then `tsc-alias` rewrites
  the `api/*` and `infra/*` path aliases into relative paths. **Both must run.**
  They are chained with `&&`, so a type error leaves `dist/` holding unresolvable
  `require("infra/...")` specifiers and `pnpm start` crashes at load. A build is
  only finished when `tsc-alias` has run.
- Emit is CommonJS: `module` is `NodeNext` and `package.json` has no
  `"type": "module"`. Do not add one without checking the whole toolchain.
- `rootDir` is the repo root and `include` is `./**/*`, so `dist/` mirrors the
  repo layout — the entrypoint is `dist/app/api/server.js`, which is what
  `pnpm start` runs. Tests are type-checked by the build too; a type error in a
  test helper fails the build.
- `dist/` is gitignored and disposable. Never edit or commit it. If its layout
  looks wrong, `rm -rf dist` and rebuild rather than reasoning about stale output.
- Dev does not use the build at all — `pnpm dev` runs the TypeScript directly via
  `tsx watch`. A change can work in dev and still break `pnpm build`, so run the
  build before calling a change done.
- CI runs `pnpm build` **before** the e2e suite. A type error fails the PR at the
  first step, no matter how the tests behave.
- Node: `.nvmrc` pins `lts/iron` (20); CI uses `lts/jod` (22). Prefer `.nvmrc`
  locally and do not rely on APIs newer than Node 20 without raising it.

## Defaults

- Stay within the requested scope. One feature or fix per change.
- Prefer the simplest working fix over a rewrite.
- A new endpoint is a new `app/api/v1/<feature>/` folder mounted in
  `app/api/v1/index.ts`. File roles and request handling are in
  the repo-root `.cursor/rules/backend/api-layering.mdc`.
- Do not edit unrelated files because they could be improved.
- Do not add dependencies without asking; prefer the stdlib or what is installed.
- Do not invent endpoints, env vars, config keys, or test results.
- Ask before destructive or irreversible actions (dropping tables, editing an
  already-applied migration, `compose:down -v`, rewriting git history).

## File-scoped rules

Coding conventions that only matter for certain files live in the repo-root `.cursor/rules/backend/`. They attach when a matching file is in context. Do not restate them here.

| Rule                 | Applies to                                                  |
| -------------------- | ----------------------------------------------------------- |
| `api-layering.mdc`   | `backend/app/api/**/*.ts`                                   |
| `sql-and-errors.mdc` | API `consts.ts` / `model.ts`, `backend/app/infra/errors/**` |
| `migrations.mdc`     | `backend/app/infra/migrations/**/*.ts`                      |
| `tests.mdc`          | `backend/app/tests/**/*.ts`                                 |
| `typescript.mdc`     | `backend/**/*.ts`                                           |

## Environment

- `.env.development`, `.env.test`, `.env.prod` are gitignored and not in the repo.
  CI writes `.env.test` from the `TEST_ENV` secret.
- Keys in use: `POSTGRES_`, `DATABASE_URL`, `NODE_ENV`, `BASE_URL`, `WEBAPP_URL`,
  `SALT_ROUNDS`, `APP_SECRET`, `BETTER_AUTH_SECRET`, `SMTP_HOST`, `SMTP_PORT`,
  `EMAIL_HTTP_HOST`, `EMAIL_HTTP_PORT`, `EMAIL_SENDER`.
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
