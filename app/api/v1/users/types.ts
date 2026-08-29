import type { Request, Response } from "express";
import { Permission } from "infra/auth/authorization";

export interface User {
  id: string;
  username: string;
  password: string;
  email: string;
  permission: Permission[];
  created_at: Date;
  updated_at: Date;
}
// ------ SCHEMAS ------
export type UserGetByUsernameQueryParam = {
  username: string;
};

export type UserGetByUsernameRequest = Request<UserGetByUsernameQueryParam>;

export interface UserGetByUsernameResponseBody {
  username: string;
  password?: string; // Internal tooling only
  email: string;
  permission: Permission[];
  created_at: string;
  updated_at: string;
}
export type UserGetByUsernameResponse = Response<UserGetByUsernameResponseBody>;

// --- POST ---
export interface UserCreateRequestBody {
  username: string;
  email: string;
  password: string;
}
export type UserCreateRequest = Request<UserCreateRequestBody>;

interface UserCreateResponseBody {
  username: string;
  created_at: string;
  updated_at: string;
}
export type UserCreateResponse = Response<UserCreateResponseBody>;

// --- PATCH ---

export type UserUpdateParams = {
  username: string;
};

export type UserUpdateRequestBody = {
  username?: string;
  email?: string;
  password?: string;
};

export type UserUpdateRequest = Request<UserUpdateParams, unknown, UserUpdateRequestBody>;

export interface UserUpdateResponseBody {
  username: string;
  email: string;
  updated_at: string;
}
export type UserUpdateResponse = Response<UserUpdateResponseBody>;

// --- GET current session user ---
export interface UserGetCurrentResponseBody {
  session: {
    updated_at: string;
    expires_at: string;
  };
  user: {
    username: string;
    email: string;
    permission: Permission[];
    updated_at: string;
  };
}
export type UserGetCurrentResponse = Response<UserGetCurrentResponseBody>;
