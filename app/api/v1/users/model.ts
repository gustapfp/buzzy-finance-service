import { DB } from "infra/database/database";
import { getProvidedValues, newUserIsValid } from "./helpers";
import { logger } from "api/utils/logger";
import { NotFoundError } from "infra/errors/NotFoundError";
import { UserGetByUsernameResponseBody, User, UserCreateRequestBody, UserUpdateRequestBody } from "./types";
import { authManager } from "infra/auth/authManager";

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

const UPDATE_USER_STATEMENT = `
UPDATE users
SET
  username = $2,
  email = $3,
  password = $4,
  updated_at = timezone('utc', now()),
  permission = $5
WHERE
  username = $1
RETURNING *;
`;

const createUser = async (user: UserCreateRequestBody) => {
  try {
    if (await newUserIsValid(user.email, user.username)) {
      const hashedPassword = await authManager.hashPassword(user.password);
      const result = await DB.query(CREATE_USER_STATEMENT, [user.username, user.email, hashedPassword]);
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

const updateUser = async (userUpdates: UserUpdateRequestBody) => {
  try {
    if (await newUserIsValid(userUpdates.email, userUpdates.username)) {
      const currentUser = await findOneByUsername(userUpdates.current_username, true);

      const newUserValues = await getProvidedValues(currentUser, userUpdates);
      const result = await DB.query(UPDATE_USER_STATEMENT, [
        userUpdates.current_username,
        newUserValues.username,
        newUserValues.email,
        newUserValues.password,
        newUserValues.permission,
      ]);
      const updatedUser = result.rows[0];
      return {
        username: updatedUser.username,
        email: updatedUser.email,
        permission: updatedUser.permission,
        updated_at: updatedUser.updated_at,
      };
    }
  } catch (err) {
    logger.error(err, "Error updating user");
    throw err;
  }
};

const findOneByUsername = async (username: string, showPassword?: boolean): Promise<UserGetByUsernameResponseBody> => {
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
      ...(showPassword && { password: user.password }),
    };
  } catch (err) {
    logger.error(err, "Error getting user by username");
    throw err;
  }
};

export const userModel = { createUser, updateUser, findOneByUsername };

export default userModel;
