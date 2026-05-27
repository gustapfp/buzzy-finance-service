export interface DatabaseConfig {
  host: string;
  port: number;
  database: string | undefined;
  user: string | undefined;
  password: string | undefined;
  ssl: boolean | undefined;
}
export interface DatabaseStatusResponse {
  update_at: string;
  postgres_version: string;
  max_connections?: number;
  active_connections?: number;
  exit_code: number;
  db_message: string;
}

export interface BaseMigrationsConfig {
  databaseUrl: string;
  dir: string; // ./infra/migrations
  direction: string; // up -> SQL rollbacks are not used in this application
  verbose: boolean;
  dryRun: boolean;
  migrationsTable: string;
}
