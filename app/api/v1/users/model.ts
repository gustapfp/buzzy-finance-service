import { DB } from "infra/database/database";
import { newUserIsValid } from "./helpers";
import { logger } from "api/utils/logger";
import { NotFoundError } from "infra/errors/NotFoundError";
import { GetUserByUsernameResponseBody, User } from "./types";

const CREATE_USER_STATEMENT = `
INSERT INTO
  users (username, email, password)
VALUES
  ($1, $2, $3)
RETURNING *;
`;

const GET_USER_BY_USERNAME_STATEMENT = `
SELECT *
FROM users
WHERE
  LOWER(username) = LOWER($1)
LIMIT
  1;
`;

const createUser = async (username: string, email: string, password: string) => {
  try {
    if (await newUserIsValid(email, username)) {
      const result = await DB.query(CREATE_USER_STATEMENT, [username, email, password]);
      const newUser: User = result.rows[0];
      return {
        username: newUser.username,
        created_at: newUser.created_at.toISOString(),
        updated_at: newUser.updated_at.toISOString(),
      };
    }
  } catch (err) {
    logger.error(err, "Error creating user");
    throw err;
  }
};

const findOneByUsername = async (username: string): Promise<GetUserByUsernameResponseBody> => {
  try {
    const result = await DB.query(GET_USER_BY_USERNAME_STATEMENT, [username]);
    if (result.rows.length === 0) {
      throw new NotFoundError(null, "User not found", "Check the username and try again.");
    }
    const user: User = result.rows[0];
    return {
      username: user.username,
      email: user.email,
      permission: user.permission,
      created_at: user.created_at.toISOString(),
      updated_at: user.updated_at.toISOString(),
    };
  } catch (err) {
    logger.error(err, "Error getting user by username");
    throw err;
  }
};

export const userModel = { createUser, findOneByUsername };

export default userModel;
