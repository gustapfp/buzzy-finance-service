import userModel from "./model";
import { handleUnexpectedError } from "../utils";
import type {
  GetUserByUsernameRequest,
  GetUserByUsernameResponse,
  UserCreateRequest,
  UserCreateResponse,
} from "./types";

export const createUserController = async (request: UserCreateRequest, response: UserCreateResponse) => {
  try {
    const newUser = await userModel.createUser(request.body.username, request.body.email, request.body.password);
    return response.status(201).json(newUser);
  } catch (err) {
    return handleUnexpectedError(err, response);
  }
};

export const getOneUserByUsernameController = async (
  request: GetUserByUsernameRequest,
  response: GetUserByUsernameResponse,
) => {
  try {
    const user = await userModel.findOneByUsername(request.params.username);
    return response.status(200).json(user);
  } catch (err) {
    return handleUnexpectedError(err, response);
  }
};
