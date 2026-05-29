import { MIGRATIONS_CONFIG } from "infra/consts";
import { DB_POOL } from "infra/database";
import { runner, RunnerOption } from "node-pg-migrate";

import { logger } from "api/utils/logger";
import { Request } from "express";
import { DryMigrationsResponse, LiveMigrationsResponse } from "./types";

export const runDryMigrationsController = async (_request: Request, response: DryMigrationsResponse) => {
  try {
    const dryMigrations = await runner({
      ...(MIGRATIONS_CONFIG as RunnerOption),
      dryRun: true,
      verbose: true,
    });
    logger.info(dryMigrations);
    return response.status(200).json(dryMigrations);
  } catch (e) {
    logger.error(e, "Error running DRY migrations");
    return response.status(500).json({ error: e as string, message: "Error running DRY migrations" });
  }
};

export const runLiveRunMigrationsController = async (_request: Request, response: LiveMigrationsResponse) => {
  const client = await DB_POOL.connect();

  try {
    await client.query("BEGIN");
    const appliedMigrations = await runner({
      ...(MIGRATIONS_CONFIG as RunnerOption),
    });
    await client.query("COMMIT");
    if (appliedMigrations.length === 0) {
      return response.status(200).json({
        message: "No migrations to apply",
        applied_migrations: [],
      });
    }
    return response.status(201).json({
      message: "All migrations applied successfully",
      applied_migrations: appliedMigrations,
    });
  } catch (e) {
    logger.error(`Error running LIVE migrations: ${e}`);
    await client.query("ROLLBACK");
    return response.status(500).json({
      error: e as string,
      message: "Error running LIVE migrations",
    });
  } finally {
    client.release();
  }
};
