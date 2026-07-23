import { BaseSession, Session } from "./types";
import { DB } from "infra/database/database";
import { authManager } from "infra/auth/authManager";
import { NotFoundError } from "infra/errors/NotFoundError";
import { logger } from "api/utils/logger";
import { Request } from "express";
import { UnauthorizedError } from "infra/errors/UnauthorizedError";
export const CREATE_SESSION_STATEMENT = `
INSERT INTO
  session (token, user_agent, user_id, expires_at)
VALUES
  ($1, $2, $3, $4, $5)
RETURNING *;
`;

export const FIND_USER_SESSION_BY_TOKEN = `
SELECT
  *
FROM
  session
WHERE
  token = $1
LIMIT 1;
`;

const createSession = async (session: BaseSession) => {
  const sessionToken = authManager.createSessionToken();
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const createSessionResponse = await DB.query(CREATE_SESSION_STATEMENT, [
    sessionToken,
    session.user_agent,
    session.user_id,
    thirtyDaysFromNow,
  ]);
  return createSessionResponse.rows[0];
};

const thisSessionIsValid = (session: Session, userAgent: string): boolean => {
  const isSessionExpired = session.expires_at > new Date(Date.now());
  const isAgentValid = session.user_agent === userAgent;
  return isSessionExpired && isAgentValid;
};

const findUserSessionByToken = async (token: string) => {
  try {
    const result = await DB.query(FIND_USER_SESSION_BY_TOKEN, [token]);
    if (result.rows.length === 0) {
      throw new NotFoundError(null, "Session not found", "Check the token and try again.");
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

export const sessionModel = { createSession, validateUserSession };

export default sessionModel;
