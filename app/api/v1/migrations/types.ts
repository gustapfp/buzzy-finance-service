import type { Response } from "express";
import type { runner } from "node-pg-migrate";
import type { ErrorResponse } from "api/types";

export type RunMigrationResult = Awaited<ReturnType<typeof runner>>;
export type MigrationsResponse = Promise<Response<RunMigrationResult[] | ErrorResponse>>;
