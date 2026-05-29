import { databaseStatus } from "../../../infra/database";
import { HealthCheck, HealthCheckResponse } from "./types";
import { Request, Response } from "express";

const healthCheckController = async (
  _request: Request,
  response: HealthCheckResponse,
): Promise<HealthCheck | Record<string, any>> => {
  const postgreSQLCheck = await databaseStatus();
  return response.status(postgreSQLCheck.exit_code === 0 ? 200 : 500).json({
    api: {
      server_message: "I'm good and running!:)",
    },
    database: postgreSQLCheck,
    status_message: postgreSQLCheck.exit_code === 0 ? "ok" : "error",
  });
};
export default healthCheckController;
