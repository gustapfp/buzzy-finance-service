# buzzy-finance-service

## What this repo is

- Express 5 + TypeScript REST API, API-first, versioned under /api/v1.
- PostgreSQL via pg (pool in app/infra/database/database.ts), schema managed by node-pg-migrate.
- pnpm is the package manager (pnpm@10.30.0, pinned via packageManager). Never use npm or yarn; never hand-edit pnpm-lock.yaml.
- Tests are end-to-end: Jest drives a real running server over fetch, against a real Postgres and a real SMTP catcher in Docker. There are no unit tests and no mocks — do not introduce mocking frameworks without asking.
- Local services (app/infra/docker/docker-compose.yml): Postgres dev (5432), Postgres test (5433), MailCatcher (SMTP 1025 / HTTP 1080).
