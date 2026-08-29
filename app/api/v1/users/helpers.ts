import { DB } from "infra/database/database";
import { ValidationError } from "infra/errors/ValidationError";
import { UserGetByUsernameResponseBody, UserUpdateRequestBody } from "./types";
import { authManager } from "infra/auth/authManager";

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

export const getUserProvidedValues = async (
  currentUser: UserGetByUsernameResponseBody,
  userUpdates: UserUpdateRequestBody,
) => {
  const newUsername = userUpdates.username ?? currentUser.username;
  const newEmail = userUpdates.email ?? currentUser.email;
  const newPassword = userUpdates.password
    ? await authManager.hashPassword(userUpdates.password)
    : currentUser!.password;
  return { username: newUsername, email: newEmail, password: newPassword };
};
