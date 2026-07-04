import { BaseError } from "./BaseError";

export class MigrationConflictError extends BaseError {
  constructor(cause: unknown) {
    super({
      cause,
      name: "migration_conflict_error",
      message: "Migration conflict detected.",
      action: "Please review the migration files and resolve the conflict.",
      status_code: 409,
    });
  }
}
