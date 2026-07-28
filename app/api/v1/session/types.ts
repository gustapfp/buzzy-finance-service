import type { Request, Response } from "express";

export interface Session {
  id: string;
  token: string;
  expires_at: Date;
  user_id: string;
  user_agent: string;
  timezone: string;
  created_at: Date;
  updated_at: Date;
}

export interface BaseSession {
  user_id: string;
  user_agent: string;
}

export interface Login {
  email: string;
  password: string;
  userAgent: string;
}

// ------ SCHEMAS ------

export interface LoginRequestBody {
  email: string;
  password: string;
}
export type LoginRequest = Request<Record<string, never>, any, LoginRequestBody>;

export interface LoginResponseBody {
  session_token: string;
}
export type LoginResponse = Response<LoginResponseBody>;
