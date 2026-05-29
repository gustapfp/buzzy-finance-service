export interface ErrorResponse {
  error: string;
  message: string;
  details?: Record<string, unknown>;
}
