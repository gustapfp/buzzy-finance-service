import type { DatabaseStatusResponse } from "infra/types";

interface ApiStatusResponse {
  server_message: String;
}
export interface HealthCheckResponse {
  api: ApiStatusResponse;
  database: DatabaseStatusResponse;
  status_message: string;
}
