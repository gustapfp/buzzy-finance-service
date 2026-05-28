export interface ErrorResponse {
  status: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
