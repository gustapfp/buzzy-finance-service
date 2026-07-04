import { ErrorResponse } from "./types";

export class InternalServerError extends Error {
  status_code: number;

  action: string;

  constructor({ cause }: { cause: unknown }) {
    super();
    this.name = "internal_server_error";
    this.message = `internal server error: ${cause}`;
    this.action = "Contact the support team.";
    this.status_code = 500;
  }

  toJSON(): ErrorResponse {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      status_code: this.status_code,
    };
  }
}
