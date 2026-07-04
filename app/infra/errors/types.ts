export interface BaseErrorResponse {
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

export type ServiceName = "Database" | "ExpressAPI" | "NextJsUI";
