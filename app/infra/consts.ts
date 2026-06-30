import { resolve } from "path";
import type { BaseMigrationsConfig, DatabaseConfig } from "./types";
import { getSSLMode } from "./utils";

export const DATABASE_CONFIG: DatabaseConfig = {
  host: process.env.POSTGRES_HOST ?? "localhost",
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  database: process.env.POSTGRES_DB as string,
  user: process.env.POSTGRES_USER as string,
  password: process.env.POSTGRES_PASSWORD as string,
  ssl: getSSLMode(process.env.NODE_ENV as string),
};

export const MIGRATIONS_CONFIG: BaseMigrationsConfig = {
  databaseUrl: String(process.env.DATABASE_URL),
  dir: resolve(__dirname, "migrations"),
  direction: "up",
  verbose: false,
  dryRun: false,
  migrationsTable: "pgmigrations",
};
