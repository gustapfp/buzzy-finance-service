import { BaseError } from "./BaseError";

export class ValidationError extends BaseError {
  constructor(cause: unknown, fields: string[]) {
    super({
      cause,
      name: "validation_error",
      message: `These fields are not valid: ${fields.length > 1 ? fields.join(",") : fields[0]}`,
      action: "Fix the provided fields and try again.",
      status_code: 422,
    });
  }
}
