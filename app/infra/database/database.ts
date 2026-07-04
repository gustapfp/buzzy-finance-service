import { Client, Pool } from "pg";
import type { QueryResult, QueryResultRow } from "pg";
import type { DatabaseStatusResponse } from "../types";
import { DATABASE_CONFIG } from "../consts";
import { logger } from "../../api/utils/logger";
import { ServiceUnavailableError } from "infra/errors/ServiceUnavailable";
import { BaseErrorResponse } from "infra/errors/types";

export const createClient = (): Client => {
  const client = new Client(DATABASE_CONFIG);
  return client;
};

export const DB_POOL: Pool = new Pool({
  ...DATABASE_CONFIG,
  max: 102,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  maxLifetimeSeconds: 60,
});

export const databaseStatus = async (): Promise<DatabaseStatusResponse | BaseErrorResponse> => {
  let client: any;
  const dbHealthStatement = `
  SELECT
    (
      SELECT count(*)::int FROM pg_stat_database
      WHERE datname = $1
    ) AS active_connections,

    current_setting('server_version') AS server_version,
    current_setting('max_connections')::int AS max_connections
  `;

  const updateAt = new Date().toISOString();

  try {
    client = await DB_POOL.connect();
    const dbHealthResponse: QueryResult = await client.query({
      text: dbHealthStatement,
      values: [DATABASE_CONFIG.database],
    });
    const dbHealthRows: QueryResultRow = dbHealthResponse.rows[0];

    return {
      update_at: updateAt,
      postgres_version: `V${dbHealthRows.server_version}`,
      max_connections: dbHealthRows.max_connections,
      active_connections: dbHealthRows.active_connections,
      db_message: "Database connection ok...",
      status_code: 200,
    };
  } catch (err) {
    logger.error(err, "database health check failed");
    const dbConnectionError = new ServiceUnavailableError("Database", err);
    return dbConnectionError.toJSON();
  } finally {
    await client?.release(true);
  }
};
