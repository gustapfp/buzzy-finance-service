import { MIGRATIONS_CONFIG } from "infra/consts";
import { runner, RunnerOption } from "node-pg-migrate";
import { DB_POOL } from "infra/database/database";
import { logger } from "api/utils/logger";
import type { RunMigrationResult } from "./types";

const runDryMigrations = async (): Promise<RunMigrationResult> => {
  try {
    const dryMigrations = await runner({
      ...(MIGRATIONS_CONFIG as RunnerOption),
      dryRun: true,
      verbose: true,
    });
    logger.info(dryMigrations);
    return dryMigrations;
  } catch (err) {
    logger.error(err, "Error running DRY migrations");
    throw err;
  }
};

const runLiveMigrations = async (): Promise<{
  message: string;
  applied_migrations: RunMigrationResult;
}> => {
  let client;
  try {
    client = await DB_POOL.connect();
    const appliedMigrations = await runner({
      ...(MIGRATIONS_CONFIG as RunnerOption),
    });
    if (appliedMigrations.length === 0) {
      return {
        message: "No migrations to apply",
        applied_migrations: [],
      };
    }
    return {
      message: "All migrations applied successfully",
      applied_migrations: appliedMigrations,
    };
  } catch (err) {
    logger.error(`Error running LIVE migrations: ${err}`);
    throw err;
  } finally {
    client?.release();
  }
};

export const migrationsModel = { runDryMigrations, runLiveMigrations };

export default migrationsModel;
