import type { BaseMigrationsConfig, DatabaseConfig } from "./types";

export const DATABASE_CONFIG: DatabaseConfig = {
  host: process.env.POSTGRES_HOST ?? "localhost",
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  database: process.env.POSTGRES_DB as string,
  user: process.env.POSTGRES_USER as string,
  password: process.env.POSTGRES_PASSWORD as string,
  ssl: process.env.NODE_ENV === "production" ? true : false,
};

export const MIGRATIONS_CONFIG: BaseMigrationsConfig = {
  databaseUrl: String(process.env.DATABASE_URL),
  dir: "./app/infra/migrations",
  direction: "up",
  verbose: false,
  dryRun: false,
  migrationsTable: "pgmigrations",
};
