import { BaseError } from "./BaseError";

export class NotFoundError extends BaseError {
  constructor(cause: unknown, message: string, action: string) {
    super({
      cause,
      name: "not_found_error",
      message: message,
      action: action,
      status_code: 404,
    });
  }
}
