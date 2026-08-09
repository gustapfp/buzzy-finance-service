import { DB } from "infra/database/database";
import { getProvidedValues, newUserIsValid } from "./helpers";
import { logger } from "api/utils/logger";
import { NotFoundError } from "infra/errors/NotFoundError";
import { User, UserCreateRequestBody, UserGetByUsernameResponseBody, UserUpdateRequestBody } from "./types";
import { authManager } from "infra/auth/authManager";
import {
  CREATE_USER_STATEMENT,
  UPDATE_USER_STATEMENT,
  GET_USER_BY_USERNAME_STATEMENT,
  GET_USER_BY_EMAIL_STATEMENT,
  GET_USER_BY_ID_STATEMENT,
} from "./consts";

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

const updateUser = async (userUpdates: UserUpdateRequestBody, current_username: string) => {
  try {
    if (await newUserIsValid(userUpdates.email, userUpdates.username)) {
      const currentUser = await findOneByUsername(current_username, true);

      const newUserValues = await getProvidedValues(currentUser, userUpdates);
      const result = await DB.query(UPDATE_USER_STATEMENT, [
        current_username,
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

const findOneByEmail = async (email: string): Promise<User> => {
  try {
    const result = await DB.query(GET_USER_BY_EMAIL_STATEMENT, [email]);
    if (result.rows.length === 0) {
      throw new NotFoundError(null, "User not found", "Check the email and try again.");
    }
    const user: User = result.rows[0];
    return user;
  } catch (err) {
    logger.error(err, "Error getting user by username");
    throw err;
  }
};

const findOneById = async (id: string): Promise<User> => {
  try {
    const result = await DB.query(GET_USER_BY_ID_STATEMENT, [id]);
    if (result.rows.length === 0) {
      throw new NotFoundError(null, "User not found", "Check the id and try again.");
    }
    const user: User = result.rows[0];
    return user;
  } catch (err) {
    logger.error(err, "Error getting user by id");
    throw err;
  }
};

export const userModel = {
  createUser,
  updateUser,
  findOneByUsername,
  findOneByEmail,
  findOneById,
};

export default userModel;
