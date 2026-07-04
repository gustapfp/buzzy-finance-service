export interface ErrorResponse {
  name: string;
  message: string;
  action: string;
  status_code: number;
}

interface ErrorOptions {
  cause: unknown;
}

export interface BaseErrorOptions extends ErrorOptions {
  name: string;
  message: string;
  action: string;
  status_code: number;
}
