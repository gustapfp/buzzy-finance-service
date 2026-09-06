import { DB } from "infra/database/database";
import { getUserProvidedValues, newUserIsValid, sendUserActivationEmail } from "./helpers";
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
  ADD_USER_PERMISSION_STATEMENT,
  REMOVE_USER_PERMISSION_STATEMENT,
  SET_USER_PERMISSIONS_STATEMENT,
} from "./consts";
import { Permission, PERMISSIONS, isValidPermission } from "infra/auth/authorization";
import { PermissionError } from "infra/errors/PermissionError";

const createUser = async (user: UserCreateRequestBody) => {
  try {
    if (await newUserIsValid(user.email, user.username)) {
      const hashedPassword = authManager.hashPassword(user.password);
      const result = await DB.query(CREATE_USER_STATEMENT, [
        user.username,
        user.email,
        hashedPassword,
        [PERMISSIONS.READ_OWN_TOKEN],
      ]);

      const newUser: User = result.rows[0];
      await sendUserActivationEmail(newUser);
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

      const newUserValues = await getUserProvidedValues(currentUser, userUpdates);
      const result = await DB.query(UPDATE_USER_STATEMENT, [
        current_username,
        newUserValues.username,
        newUserValues.email,
        newUserValues.password,
      ]);
      const updatedUser = result.rows[0];
      return {
        username: updatedUser.username,
        email: updatedUser.email,
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

const addUserPermission = async (username: string, permission: Permission): Promise<User | null> => {
  try {
    if (!isValidPermission(permission)) {
      throw new PermissionError(null, permission);
    }
    const result = await DB.query(ADD_USER_PERMISSION_STATEMENT, [username, permission]);
    if (result.rows.length === 0) {
      await findOneByUsername(username);
      return null;
    }
    return result.rows[0];
  } catch (err) {
    logger.error(err, "Error adding permission to user");
    throw err;
  }
};

const removeUserPermission = async (username: string, permission: Permission): Promise<User | null> => {
  try {
    if (!isValidPermission(permission)) {
      throw new PermissionError(null, permission);
    }
    const result = await DB.query(REMOVE_USER_PERMISSION_STATEMENT, [username, permission]);
    if (result.rows.length === 0) {
      await findOneByUsername(username);
      return null;
    }
    return result.rows[0];
  } catch (err) {
    logger.error(err, "Error removing permission from user");
    throw err;
  }
};

const setUserPermissions = async (username: string, permissions: Permission[]): Promise<User | null> => {
  try {
    const invalidPermission = permissions.find((permission) => !isValidPermission(permission));
    if (invalidPermission) {
      throw new PermissionError(null, invalidPermission);
    }
    const result = await DB.query(SET_USER_PERMISSIONS_STATEMENT, [username, permissions]);
    if (result.rows.length === 0) {
      await findOneByUsername(username);
      return null;
    }
    return result.rows[0];
  } catch (err) {
    logger.error(err, "Error setting user permissions");
    throw err;
  }
};

export const userModel = {
  createUser,
  updateUser,
  findOneByUsername,
  findOneByEmail,
  findOneById,
  addUserPermission,
  removeUserPermission,
  setUserPermissions,
};

export default userModel;
