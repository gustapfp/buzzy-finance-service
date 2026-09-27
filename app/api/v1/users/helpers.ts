import { DB } from "infra/database/database";
import { BaseError } from "infra/errors/BaseError";
import { NotFoundError } from "infra/errors/NotFoundError";
import { ValidationError } from "infra/errors/ValidationError";
import { libraryStatusCode } from "api/utils/auth";

const thisEmailAlreadyExits = async (email: string): Promise<boolean> => {
  const statement = `
  SELECT email
  FROM USERS
  WHERE
    LOWER(email) = LOWER($1);
  `;
  const queryResponse = await DB.query(statement, [email]);
  if (queryResponse.rows.length > 0) {
    return true;
  }
  return false;
};

const thisUsernameAlreadyExits = async (username: string) => {
  const statement = `
  SELECT username
  FROM USERS
  WHERE
    LOWER(username) = LOWER($1);
  `;
  const queryResponse = await DB.query(statement, [username]);
  if (queryResponse.rows.length > 0) {
    return true;
  }
  return false;
};

export const takenFields = async (email?: string, username?: string): Promise<string[]> => {
  const [emailExists, usernameExists] = await Promise.all([
    email ? thisEmailAlreadyExits(email) : Promise.resolve(false),
    username ? thisUsernameAlreadyExits(username) : Promise.resolve(false),
  ]);
  return [emailExists ? "email" : "", usernameExists ? "username" : ""].filter((field) => field !== "");
};

export const newUserIsValid = async (email?: string, username?: string) => {
  const fields = await takenFields(email, username);
  if (fields.length > 0) {
    throw new ValidationError("Fields already exists in database.", fields);
  }

  return true;
};

export const passwordLengthIsValid = (password: string) => {
  if (password.length < 8 || password.length > 128) {
    throw new ValidationError(null, ["password"]);
  }
};

export const activationNotFound = (cause: unknown) =>
  new NotFoundError(cause, "Activation token not found or expired", "Please request a new activation token.");

export const isRejectedActivation = (err: unknown) => {
  if (err instanceof BaseError) {
    return err.status_code < 500;
  }
  const statusCode = libraryStatusCode(err);
  if (statusCode === undefined) {
    return false;
  }
  return statusCode < 500;
};
