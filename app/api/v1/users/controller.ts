import userModel from "./model";
import { logger } from "api/utils/logger";
import { handleUnexpectedError } from "../utils";
import type { UserCreateRequest, UserCreateResponse } from "./types";

export const createUserController = async (request: UserCreateRequest, response: UserCreateResponse) => {
  try {
    const newUser = await userModel.createUser(request.body.username, request.body.email, request.body.password);
    return response.status(201).json({
      username: newUser.username,
      created_at: newUser.createdAt,
      updated_at: newUser.updatedAt,
    });
  } catch (err) {
    logger.error(err, "Error creating user");
    return handleUnexpectedError(err, response);
  }
};
