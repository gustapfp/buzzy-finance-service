import sessionModel from "./model";
import { handleUnexpectedError } from "../utils";
import { LoginRequest, LoginResponse } from "./types";
import { Request, Response } from "express";

export const loginController = async (request: LoginRequest, response: LoginResponse) => {
  try {
    await sessionModel.login(request, response);
    return response.status(200).json({});
  } catch (err) {
    return handleUnexpectedError(err, response);
  }
};

export const logoutController = async (request: Request, response: Response) => {
  try {
    await sessionModel.logout(request, response);
    return response.status(200).end();
  } catch (err) {
    return handleUnexpectedError(err, response);
  }
};
