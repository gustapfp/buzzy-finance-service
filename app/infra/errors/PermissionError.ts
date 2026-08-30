import { BaseError } from "./BaseError";

export class PermissionError extends BaseError {
  constructor(cause: unknown, permission: string) {
    super({
      cause,
      name: "permission_error",
      message: `"${permission}" is not a recognized permission.`,
      action: "Use one of the permissions defined in the PERMISSIONS catalog.",
      status_code: 422,
    });
  }
}
