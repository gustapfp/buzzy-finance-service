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
  FIND_USER_SESSION_BY_TOKEN,
  MAX_SESSIONS_PER_USER,
} from "./consts";

const evictOldestSessions = async (userId: string) => {
  await DB.query(EVICT_OLDEST_SESSIONS_STATEMENT, [userId, MAX_SESSIONS_PER_USER]);
};

const createSession = async (session: BaseSession) => {
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

const thisSessionIsValid = (session: Session, userAgent: string): boolean => {
  const isSessionActive = session.expires_at > new Date(Date.now());
  const isAgentValid = session.user_agent === userAgent;
  return isSessionActive && isAgentValid;
};

const findUserSessionByToken = async (token: string) => {
  try {
    const result = await DB.query(FIND_USER_SESSION_BY_TOKEN, [token]);
    if (result.rows.length === 0) {
      throw new UnauthorizedError(null);
    }
    const session: Session = result.rows[0];

    return session;
  } catch (err) {
    logger.error(err, "Error getting session by token");
    throw err;
  }
};

const validateUserSession = async (req: Request) => {
  try {
    const token = authManager.getTokenFromCookie(req);
    const userAgent = authManager.getUserAgent(req);
    const userSession = await findUserSessionByToken(token);
    if (!thisSessionIsValid(userSession, userAgent)) {
      throw new UnauthorizedError(null);
    }
    return userSession;
  } catch (err) {
    logger.error(err, "Error validating user session");
    throw err;
  }
};

const login = async (loginObj: Login) => {
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
