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
import { getAuth, toAuthHeaders } from "api/utils/auth";
import { activationNotFound, isRejectedActivation } from "./helpers";

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
    const updatedUser = await userModel.updateUser(request.body, request.params.username, request);
    return response.status(200).json(updatedUser);
  } catch (err) {
    return handleUnexpectedError(err, response);
  }
};

export const getCurrentUserController = async (request: Request, response: UserGetCurrentResponse) => {
  try {
    const body = await sessionModel.getCurrentUser(request, response);
    response.setHeader("Cache-Control", "no-cache, no-store, max-age=0, must-revalidate");
    return response.status(200).json(body);
  } catch (err) {
    return handleUnexpectedError(err, response);
  }
};

export const activateUserController = async (request: Request, response: Response) => {
  try {
    const token = request.query.token;
    if (typeof token !== "string" || token.length === 0) {
      throw activationNotFound(null);
    }
    const auth = await getAuth();
    const headers = await toAuthHeaders(request.headers);
    try {
      await auth.api.verifyEmail({
        query: { token },
        headers,
      });
    } catch (err) {
      if (isRejectedActivation(err)) {
        throw activationNotFound(err);
      }
      throw err;
    }
    return response.status(200).json({ message: "User activated successfully" });
  } catch (err) {
    return handleUnexpectedError(err, response);
  }
};

export const resendActivationController = async (request: Request, response: Response) => {
  try {
    const auth = await getAuth();
    const headers = await toAuthHeaders(request.headers);
    const email = typeof request.body?.email === "string" ? request.body.email : "";
    await auth.api.sendVerificationEmail({
      body: { email },
      headers,
    });
    return response.status(200).json({
      message: "If an unactivated account exists for that email, a new link was sent.",
    });
  } catch (err) {
    return handleUnexpectedError(err, response);
  }
};
