import { BaseSession, Login, Session } from "./types";
import { DB } from "infra/database/database";
import { authManager } from "infra/auth/authManager";
import { logger } from "api/utils/logger";
import { Request } from "express";
import { UnauthorizedError } from "infra/errors/UnauthorizedError";
import { stringifySetCookie } from "cookie";
import {
  CREATE_SESSION_STATEMENT,
  DELETE_SESSION_STATEMENT,
  EVICT_OLDEST_SESSIONS_STATEMENT,
  FIND_ONE_VALID_SESSION_BY_TOKEN_STATEMENT,
  MAX_SESSIONS_PER_USER,
  UPDATE_SESSION_EXPIRES_AT_STATEMENT,
} from "./consts";

const evictOldestSessions = async (userId: string) => {
  await DB.query(EVICT_OLDEST_SESSIONS_STATEMENT, [userId, MAX_SESSIONS_PER_USER]);
};

const createSession = async (session: BaseSession): Promise<Session> => {
  await evictOldestSessions(session.user_id);

  const sessionToken = authManager.createSessionToken();
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const createSessionResponse = await DB.query(CREATE_SESSION_STATEMENT, [
    sessionToken,
    session.user_agent,
    session.user_id,
    thirtyDaysFromNow,
  ]);
  const newSession: Session = createSessionResponse.rows[0];
  return newSession;
};

const refreshSession = async (session: Session): Promise<Session> => {
  const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const result = await DB.query(UPDATE_SESSION_EXPIRES_AT_STATEMENT, [newExpiresAt, session.id]);
  const updatedSession: Session = result.rows[0];
  return updatedSession;
};

const findOneValidSessionByToken = async (token: string, userAgent: string): Promise<Session> => {
  try {
    const result = await DB.query(FIND_ONE_VALID_SESSION_BY_TOKEN_STATEMENT, [token, userAgent]);
    if (result.rows.length === 0) {
      throw new UnauthorizedError(null);
    }
    const session: Session = result.rows[0];
    await refreshSession(session);
    return session;
  } catch (err) {
    logger.error(err, "Error getting session by token");
    throw err;
  }
};

const validateUserSession = async (req: Request): Promise<Session> => {
  try {
    const token = authManager.getTokenFromCookie(req);
    const userAgent = authManager.getUserAgent(req);
    const userSession = await findOneValidSessionByToken(token, userAgent);
    return userSession;
  } catch (err) {
    logger.error(err, "Error validating user session");
    throw err;
  }
};

const login = async (loginObj: Login): Promise<string> => {
  try {
    const user = await authManager.authenticate(loginObj.email, loginObj.password);
    const session: Session = await createSession({
      user_id: user.id,
      user_agent: loginObj.userAgent,
    });
    return session.token;
  } catch (err) {
    logger.error(err, "Error logging in");
    throw err;
  }
};

const logout = async (req: Request) => {
  try {
    const userSession = await validateUserSession(req);
    const result = await DB.query(DELETE_SESSION_STATEMENT, [userSession.token]);
    return result.rows[0];
  } catch (err) {
    logger.error(err, "Error logging out");
    throw err;
  }
};

const createCookieSession = (token: string, sessionLengthInDays: number = 30) => {
  return stringifySetCookie({
    name: "sdi",
    value: token,
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * sessionLengthInDays,
    path: "/",
  });
};

export const sessionModel = { createSession, validateUserSession, login, logout, createCookieSession };

export default sessionModel;
