import userModel from "./model";
import { handleUnexpectedError } from "../utils";
import type {
  UserGetByUsernameRequest,
  UserGetByUsernameResponse,
  UserCreateRequest,
  UserCreateResponse,
  UserUpdateRequest,
  UserUpdateResponse,
  UserGetCurrentResponse,
} from "./types";
import type { Request, Response } from "express";
import sessionModel from "../session/model";
import { activationManager } from "infra/auth/activation";

export const getOneUserByUsernameController = async (
  request: UserGetByUsernameRequest,
  response: UserGetByUsernameResponse,
) => {
  try {
    await sessionModel.validateUserSession(request);
    const user = await userModel.findOneByUsername(request.params.username);
    return response.status(200).json(user);
  } catch (err) {
    return handleUnexpectedError(err, response);
  }
};

export const createUserController = async (request: UserCreateRequest, response: UserCreateResponse) => {
  try {
    const newUser = await userModel.createUser(request.body);
    return response.status(201).json(newUser);
  } catch (err) {
    return handleUnexpectedError(err, response);
  }
};

export const updateUserController = async (request: UserUpdateRequest, response: UserUpdateResponse) => {
  try {
    const updatedUser = await userModel.updateUser(request.body, request.params.username);
    return response.status(200).json(updatedUser);
  } catch (err) {
    return handleUnexpectedError(err, response);
  }
};

export const getCurrentUserController = async (request: Request, response: UserGetCurrentResponse) => {
  try {
    const { session, user } = await sessionModel.getSessionUser(request);
    response.setHeader("Set-Cookie", sessionModel.createCookieSession(session.token));
    response.setHeader("Cache-Control", "no-cache, no-store, max-age=0, must-revalidate");
    return response.status(200).json({
      session: {
        updated_at: session.updated_at.toISOString(),
        expires_at: session.expires_at.toISOString(),
      },
      user: {
        username: user.username,
        email: user.email,
        permission: user.permission,
        updated_at: user.updated_at.toISOString(),
      },
    });
  } catch (err) {
    return handleUnexpectedError(err, response);
  }
};

export const activateUserController = async (request: Request, response: Response) => {
  try {
    const { token, email } = request.query;
    const user = await userModel.findOneByEmail(email as string);
    const isTokenValid = await activationManager.activateUserToken(token as string, user.id);
    if (!isTokenValid) {
      return response.status(400).json({ message: "Invalid or expired activation token" });
    }
    return response.status(200).json({ message: "User activated successfully" });
  } catch (err) {
    return handleUnexpectedError(err, response);
  }
};
