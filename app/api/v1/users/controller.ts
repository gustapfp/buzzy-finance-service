import userModel from "./model";
import { handleUnexpectedError } from "../utils";
import type {
  UserGetByUsernameRequest,
  UserGetByUsernameResponse,
  UserCreateRequest,
  UserCreateResponse,
} from "./types";

export const createUserController = async (request: UserCreateRequest, response: UserCreateResponse) => {
  try {
    const newUser = await userModel.createUser(request.body);
    return response.status(201).json(newUser);
  } catch (err) {
    return handleUnexpectedError(err, response);
  }
};

export const getOneUserByUsernameController = async (
  request: UserGetByUsernameRequest,
  response: UserGetByUsernameResponse,
) => {
  try {
    const user = await userModel.findOneByUsername(request.params.username);
    return response.status(200).json(user);
  } catch (err) {
    return handleUnexpectedError(err, response);
  }
};
