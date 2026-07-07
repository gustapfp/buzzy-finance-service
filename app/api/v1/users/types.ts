import type { Request, Response } from "express";
export type Permission = "ADMIN" | "USER" | "GUEST";
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
