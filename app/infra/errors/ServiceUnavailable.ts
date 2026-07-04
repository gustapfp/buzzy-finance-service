import { BaseError } from "./BaseError";
import type { ServiceName } from "./types";
export class ServiceUnavailableError extends BaseError {
  constructor(serviceName: ServiceName, cause: unknown) {
    super({
      cause,
      name: "service_unavailable_error",
      message: `The ${serviceName} is not available for connection right now.`,
      action: "Notify the support team and try again later.",
      status_code: 503,
    });
  }
}
