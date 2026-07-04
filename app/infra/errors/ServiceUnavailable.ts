import { BaseError } from "./BaseError";

export class ServiceUnavailableError extends BaseError {
  constructor(serviceName: string, cause: unknown) {
    super({
      cause,
      name: "service_unavailable_error",
      message: `The ${serviceName} is not available for connection right now.`,
      action: "Notify the support team and try again later.",
      status_code: 503,
    });
  }
}
