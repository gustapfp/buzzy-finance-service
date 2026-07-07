import type { Request } from "express";
export type Permission = "ADMIN" | "USER" | "GUEST";
export interface UserCreateRequestBody {
  username: string;
  email: string;
  password: string;
}
export type UserCreateRequest = Request<UserCreateRequestBody>;
// export interface UserCreateResponse {}
