import bcrypt from "bcrypt";
import { SALT_ROUNDS, APP_SECRET } from "./consts";
import crypto from "node:crypto";
import { Request } from "express";
import { UnauthorizedError } from "infra/errors/UnauthorizedError";
import { logger } from "api/utils/logger";
import userModel from "api/v1/users/model";

const hashPassword = async (password: string): Promise<string> => {
  const hash = await bcrypt.hashSync(`${password}.${APP_SECRET}`, SALT_ROUNDS);
  return hash;
};
const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  const passwordIsValid = await bcrypt.compareSync(`${password}.${APP_SECRET}`, hash);
  if (!passwordIsValid) {
    throw new UnauthorizedError(null);
  }
  return passwordIsValid;
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
  const sessionToken = req.cookies.sdi;
  if (!sessionToken) {
    throw new UnauthorizedError(null);
  }
  return sessionToken;
};

const authenticate = async (email: string, password: string) => {
  try {
    const user = await userModel.findOneByEmail(email);
    await comparePassword(password, user.password);
    return user;
  } catch (err) {
    logger.error(err, "Error authenticating");
    throw new UnauthorizedError(err);
  }
};

export const authManager = {
  authenticate,
  hashPassword,
  comparePassword,
  createSessionToken,
  getUserAgent,
  getTokenFromCookie,
};
