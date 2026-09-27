import { Request, Response } from "express";
import { BaseError } from "infra/errors/BaseError";
import { InternalServerError } from "infra/errors/InternalServerError";
import { MethodNotAllowed } from "infra/errors/MethodNotAllowed";

export const catchNotAllowedMethods = async (_request: Request, response: Response) => {
  const methodNotAllowedError = new MethodNotAllowed();
  return response.status(methodNotAllowedError.status_code).json(methodNotAllowedError);
};

export const handleUnexpectedError = async (error: unknown, response: Response) => {
  if (error instanceof BaseError) {
    return response.status(error.status_code).json(error);
  }
  const unexpectedError = new InternalServerError(error);
  return response.status(unexpectedError.status_code).json(unexpectedError);
};
