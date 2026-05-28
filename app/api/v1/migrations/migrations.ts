import { MIGRATIONS_CONFIG } from "infra/consts";
import { DB_POOL } from "infra/database";
import { runner, RunnerOption } from "node-pg-migrate";
import { RunMigrationResult } from "./types";

export const runDryMigrations: () => Promise<RunMigrationResult> = async () => {
  try {
    return await runner({
      ...(MIGRATIONS_CONFIG as RunnerOption),
      dryRun: true,
      verbose: true,
    });
  } catch (e) {
    console.error(`Error running DRY migrations: ${e}`);
    throw e;
  }
};

export const runLiveRunMigrations: () => Promise<RunMigrationResult> = async () => {
  const client = await DB_POOL.connect();

  try {
    await client.query("BEGIN");
    const appliedMigrations = await runner({
      ...(MIGRATIONS_CONFIG as RunnerOption),
    });
    await client.query("COMMIT");
    return appliedMigrations;
  } catch (e) {
    console.error(`Error running LIVE migrations: ${e}`);
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
};
