import { BaseError } from "./BaseError";

export class UnauthorizedError extends BaseError {
  constructor(cause?: unknown) {
    super({
      cause,
      name: "unauthorized",
      message: "User Unauthorized to do this operation.",
      action: "Please try to login again or if you're facing any issue contact the support team.",
      status_code: 401,
    });
  }
}
