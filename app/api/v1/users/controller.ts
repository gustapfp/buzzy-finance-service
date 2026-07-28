import userModel from "./model";
import { handleUnexpectedError } from "../utils";
import type {
  UserGetByUsernameRequest,
  UserGetByUsernameResponse,
  UserCreateRequest,
  UserCreateResponse,
  UserUpdateRequest,
  UserUpdateResponse,
} from "./types";

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
