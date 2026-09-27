# buzzy-finance-service

## What this repo is

- Express 5 + TypeScript REST API, API-first, versioned under /api/v1.
- PostgreSQL via pg (pool in app/infra/database/database.ts), schema managed by node-pg-migrate.
- pnpm is the package manager (pnpm@10.30.0, pinned via packageManager). Never use npm or yarn; never hand-edit pnpm-lock.yaml.
- Tests are end-to-end: Jest drives a real running server over fetch, against a real Postgres and a real SMTP catcher in Docker. There are no unit tests and no mocks — do not introduce mocking frameworks without asking.
- Local services (app/infra/docker/docker-compose.yml): Postgres (5432), MailCatcher (SMTP 1025 / HTTP 1080).

## Commands

| Task                                  | Command                                             |
| ------------------------------------- | --------------------------------------------------- |
| Run dev API                           | `pnpm dev`                                          |
| Run the full e2e suite                | `pnpm test`                                         |
| Watch tests                           | `pnpm watch`                                        |
| Type-check / build                    | `pnpm build`                                        |
| Lint                                  | `pnpm lint:eslint:check`                            |
| Format / check format                 | `pnpm lint:prettier` / `pnpm lint:prettier:check`   |
| New migration                         | `pnpm migrate:create <name>`                        |
| Apply / revert migrations             | `pnpm migrate:up` / `pnpm migrate:down`             |
| Docker services                       | `pnpm compose:up` / `compose:stop` / `compose:down` |

`pnpm test` boots Docker, starts the API with `.env.development`, and runs Jest with `--runInBand`. It needs Docker running. A test run clears the development database.
