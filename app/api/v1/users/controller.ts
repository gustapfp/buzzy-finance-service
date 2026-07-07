import { Response } from "express";
import userModel from "./model";
import { logger } from "api/utils/logger";
import { handleUnexpectedError } from "../utils";
import type { UserCreateRequest } from "./types";

export const createUserController = async (request: UserCreateRequest, response: Response) => {
  try {
    const newUser = await userModel.createUser(request.body.username, request.body.email, request.body.password);
    return response.status(201).json(newUser);
  } catch (err) {
    logger.error(err, "Error creating user");
    return handleUnexpectedError(err, response);
  }
};
