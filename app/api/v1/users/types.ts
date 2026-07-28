import type { Request, Response } from "express";
export type Permission = "ADMIN" | "USER" | "GUEST";

export interface User {
  id: string;
  username: string;
  password: string;
  email: string;
  permission: Permission | null;
  created_at: Date;
  updated_at: Date;
}
// ------ SCHEMAS ------
export interface UserGetByUsernameQueryParam {
  username: string;
}
export type UserGetByUsernameRequest = Request<UserGetByUsernameQueryParam>;

export interface UserGetByUsernameResponseBody {
  username: string;
  password?: string; // Internal tooling only
  email: string;
  permission: Permission | null;
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

export interface UserUpdateParams {
  username: string;
}

export interface UserUpdateRequestBody {
  username?: string;
  email?: string;
  password?: string;
  permission?: Permission;
}

export type UserUpdateRequest = Request<UserUpdateParams, unknown, UserUpdateRequestBody>;

export interface UserUpdateResponseBody {
  username: string;
  email: string;
  permission?: Permission;
  updated_at: string;
}
export type UserUpdateResponse = Response<UserUpdateResponseBody>;
