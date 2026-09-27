import { BaseError } from "./BaseError";

export class InternalServerError extends BaseError {
  constructor(cause: unknown) {
    super({
      cause,
      name: "internal_server_error",
      message: "An unexpected error occurred.",
      action: "Contact the support team.",
      status_code: 500,
    });
  }
}
