import { BaseErrorOptions, BaseErrorResponse } from "./types";

export class BaseError extends Error {
  status_code: number;
  action: string;

  constructor({ status_code, action, cause, name, message }: BaseErrorOptions) {
    super(message, { cause });
    this.name = name;
    this.action = action;
    this.status_code = status_code;
  }

  toJSON(): BaseErrorResponse {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      status_code: this.status_code,
    };
  }
}
