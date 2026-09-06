import migrationsModel from "./model";
import { handleUnexpectedError } from "../utils";
import { Request } from "express";
import { DryMigrationsResponse, LiveMigrationsResponse } from "./types";

export const runDryMigrationsController = async (_request: Request, response: DryMigrationsResponse) => {
  try {
    const dryMigrations = await migrationsModel.runDryMigrations();
    return response.status(200).json(dryMigrations);
  } catch (e) {
    return handleUnexpectedError(e, response);
  }
};

export const runLiveRunMigrationsController = async (_request: Request, response: LiveMigrationsResponse) => {
  try {
    const result = await migrationsModel.runLiveMigrations();
    const status = result.applied_migrations.length === 0 ? 200 : 201;
    return response.status(status).json(result);
  } catch (e) {
    return handleUnexpectedError(e, response);
  }
};
