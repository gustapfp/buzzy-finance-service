import type { DatabaseStatusResponse } from "infra/types";
import { Response } from "express";
export type HealthCheckResponse = Response<HealthCheck>;
interface ApiStatusResponse {
  server_message: String;
}
export interface HealthCheck {
  api: ApiStatusResponse;
  database: DatabaseStatusResponse;
  status_message: string;
}
