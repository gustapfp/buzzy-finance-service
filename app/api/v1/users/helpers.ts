import { DB } from "infra/database/database";
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

export const newUserIsValid = async (email: string, username: string) => {
  const [emailExists, usernameExists] = await Promise.all([
    thisEmailAlreadyExits(email),
    thisUsernameAlreadyExits(username),
  ]);
  if (emailExists || usernameExists) {
    throw new ValidationError(
      "Fields already exists in database.",
      [emailExists ? "email" : "", usernameExists ? "username" : ""].filter((field) => field !== ""),
    );
  }

  return true;
};
