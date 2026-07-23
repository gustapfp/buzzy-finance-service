import bcrypt from "bcrypt";
import { SALT_ROUNDS, APP_SECRET } from "./consts";
import crypto from "node:crypto";
import { Request } from "express";
import { UnauthorizedError } from "infra/errors/UnauthorizedError";

const hashPassword = async (password: string): Promise<string> => {
  const hash = await bcrypt.hashSync(`${password}.${APP_SECRET}`, SALT_ROUNDS);
  return hash;
};
const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compareSync(`${password}.${APP_SECRET}`, hash);
};

const createSessionToken = (): string => {
  return crypto.randomBytes(64).toString("hex");
};
const getUserAgent = (req: Request): string => {
  const userAgent = req.headers["user-agent"];
  if (!userAgent) {
    throw new UnauthorizedError(null);
  }
  return userAgent;
};

const getTokenFromCookie = (req: Request) => {
  const sessionToken = req.cookies.token;
  if (!sessionToken) {
    throw new UnauthorizedError(null);
  }
  return sessionToken;
};

export const authManager = {
  hashPassword,
  comparePassword,
  createSessionToken,
  getUserAgent,
  getTokenFromCookie,
};
