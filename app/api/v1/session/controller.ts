import sessionModel from "./model";
import { authManager } from "infra/auth/authManager";
import { handleUnexpectedError } from "../utils";
import { LoginRequest, LoginResponse } from "./types";
import { Request, Response } from "express";
export const loginController = async (request: LoginRequest, response: LoginResponse) => {
  try {
    const token = await sessionModel.login({
      email: request.body.email,
      password: request.body.password,
      userAgent: authManager.getUserAgent(request),
    });
    response.setHeader("Set-Cookie", sessionModel.createCookieSession(token));
    return response.status(200).json({ session_token: token });
  } catch (err) {
    return handleUnexpectedError(err, response);
  }
};

export const logoutController = async (request: Request, response: Response) => {
  try {
    await sessionModel.logout(request);
    return response.status(200).clearCookie("sdi").end();
  } catch (err) {
    return handleUnexpectedError(err, response);
  }
};
