import { databaseStatus } from "infra/database";
import { HealthCheckResponse } from "./types";
import { Request, Response } from "express";
import { logger } from "api/utils/logger";

const healthCheck = async (
  request: Request,
  response: Response<HealthCheckResponse>,
): Promise<HealthCheckResponse | Record<string, any>> => {
  const postgreSQLCheck = await databaseStatus();
  logger.info(postgreSQLCheck);
  return response.status(postgreSQLCheck.exit_code === 0 ? 200 : 500).json({
    api: {
      server_message: "I'm good and running!:)",
    },
    database: postgreSQLCheck,
    status_message: postgreSQLCheck.exit_code === 0 ? "ok" : "error",
  });
};
export default healthCheck;
