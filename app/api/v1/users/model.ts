import { DB } from "infra/database/database";
import { newUserIsValid, passwordLengthIsValid } from "./helpers";
import { logger } from "api/utils/logger";
import { NotFoundError } from "infra/errors/NotFoundError";
import { User, UserCreateRequestBody, UserGetByUsernameResponseBody, UserUpdateRequestBody } from "./types";
import { getAuth, toAuthHeaders } from "api/utils/auth";
import type { Request } from "express";
import {
  UPDATE_USER_STATEMENT,
  UPDATE_ACCOUNT_PASSWORD_STATEMENT,
  DELETE_OTHER_SESSIONS_STATEMENT,
  GET_USER_BY_USERNAME_STATEMENT,
  GET_USER_BY_EMAIL_STATEMENT,
  GET_USER_BY_ID_STATEMENT,
  ADD_USER_PERMISSION_STATEMENT,
  REMOVE_USER_PERMISSION_STATEMENT,
  SET_USER_PERMISSIONS_STATEMENT,
} from "./consts";
import { Permission, isValidPermission } from "infra/auth/authorization";
import { PermissionError } from "infra/errors/PermissionError";

const createUser = async (user: UserCreateRequestBody) => {
  try {
    passwordLengthIsValid(user.password);
    await newUserIsValid(user.email, user.username);
    const auth = await getAuth();
    await auth.api.signUpEmail({
      body: {
        name: user.username,
        email: user.email,
        password: user.password,
      },
    });
    const stored = await findOneByEmail(user.email);
    return {
      username: stored.username,
      created_at: stored.created_at.toISOString(),
      updated_at: stored.updated_at.toISOString(),
    };
  } catch (err) {
    logger.error(err, "Error creating user");
    throw err;
  }
};

const updateUser = async (userUpdates: UserUpdateRequestBody, current_username: string, request: Request) => {
  try {
    if (userUpdates.password !== undefined) {
      passwordLengthIsValid(userUpdates.password);
    }
    await newUserIsValid(userUpdates.email, userUpdates.username);
    const currentUser = await findOneByEmailOrUsername(current_username);
    const nextUsername = userUpdates.username ?? currentUser.username;
    const nextEmail = (userUpdates.email ?? currentUser.email).toLowerCase();
    const result = await DB.query(UPDATE_USER_STATEMENT, [current_username, nextUsername, nextEmail]);
    const updatedUser = result.rows[0];
    if (userUpdates.password) {
      const { hashPassword } = await import("better-auth/crypto");
      const hash = await hashPassword(userUpdates.password);
      await DB.query(UPDATE_ACCOUNT_PASSWORD_STATEMENT, [currentUser.id, hash]);
      const auth = await getAuth();
      const headers = await toAuthHeaders(request.headers);
      const session = await auth.api.getSession({ headers });
      if (session && session.user.id === currentUser.id) {
        await DB.query(DELETE_OTHER_SESSIONS_STATEMENT, [currentUser.id, session.session.token]);
      }
    }
    return {
      username: updatedUser.username,
      email: updatedUser.email,
      updated_at: updatedUser.updated_at.toISOString(),
    };
  } catch (err) {
    logger.error(err, "Error updating user");
    throw err;
  }
};

const findOneByEmailOrUsername = async (username: string): Promise<User> => {
  const result = await DB.query(GET_USER_BY_USERNAME_STATEMENT, [username]);
  if (result.rows.length === 0) {
    throw new NotFoundError(null, "User not found", "Check the username and try again.");
  }
  return result.rows[0];
};

const findOneByUsername = async (username: string): Promise<UserGetByUsernameResponseBody> => {
  try {
    const user = await findOneByEmailOrUsername(username);
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
