import { DB } from "infra/database/database";
import { BaseError } from "infra/errors/BaseError";
import { NotFoundError } from "infra/errors/NotFoundError";
import { ValidationError } from "infra/errors/ValidationError";

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

export const newUserIsValid = async (email?: string, username?: string) => {
  const [emailExists, usernameExists] = await Promise.all([
    email ? thisEmailAlreadyExits(email) : Promise.resolve(false),
    username ? thisUsernameAlreadyExits(username) : Promise.resolve(false),
  ]);
  if (emailExists || usernameExists) {
    throw new ValidationError(
      "Fields already exists in database.",
      [emailExists ? "email" : "", usernameExists ? "username" : ""].filter((field) => field !== ""),
    );
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
  if (typeof err === "object" && err && "status" in err) {
    const status = Number((err as { status: unknown }).status);
    if (Number.isFinite(status)) {
      return status < 500;
    }
  }
  return true;
};
