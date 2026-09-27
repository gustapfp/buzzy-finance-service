import type { DatabaseStatusResponse } from "infra/types";
import type { Response } from "express";
import { BaseErrorResponse } from "infra/errors/types";
export type HealthCheckResponse = Response<HealthCheck>;
interface ApiStatusResponse {
  server_message: string;
}
export interface HealthCheck {
  api: ApiStatusResponse;
  database: DatabaseStatusResponse | BaseErrorResponse;
  status_message: string;
}
