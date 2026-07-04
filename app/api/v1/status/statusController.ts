import { databaseStatus } from "infra/database/database";
import { HealthCheck, HealthCheckResponse } from "./types";
import { Request } from "express";

const healthCheckController = async (
  _request: Request,
  response: HealthCheckResponse,
): Promise<HealthCheck | Record<string, any>> => {
  const postgreSQLCheck = await databaseStatus();
  return response.status(postgreSQLCheck.status_code).json({
    api: {
      server_message: "I'm good and running!:)",
    },
    database: postgreSQLCheck,
    status_message: postgreSQLCheck.status_code === 200 ? "ok" : "error",
  });
};
export default healthCheckController;
