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

export interface GetUserByUsernameQueryParam {
  username: string;
}
export type GetUserByUsernameRequest = Request<GetUserByUsernameQueryParam>;

export interface GetUserByUsernameResponseBody {
  username: string;
  email: string;
  permission: Permission | null;
  created_at: string;
  updated_at: string;
}
export type GetUserByUsernameResponse = Response<GetUserByUsernameResponseBody>;

// --- POST ---
interface UserCreateRequestBody {
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
