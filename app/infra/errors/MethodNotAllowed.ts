import { BaseError } from "./BaseError";

export class MethodNotAllowed extends BaseError {
  constructor(cause?: unknown) {
    super({
      cause,
      name: "method_not_allowed",
      message: "Method not allowed.",
      action: "Please, check the docs or contact the support to use the right method.",
      status_code: 405,
    });
  }
}
