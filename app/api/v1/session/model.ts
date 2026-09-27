import { Request, Response } from "express";
import { UnauthorizedError } from "infra/errors/UnauthorizedError";
import { NotFoundError } from "infra/errors/NotFoundError";
import { copySetCookie, getAuth, toAuthHeaders } from "api/utils/auth";
import { logger } from "api/utils/logger";
import userModel from "../users/model";
import { LoginRequestBody } from "./types";

const login = async (request: Request<Record<string, never>, unknown, LoginRequestBody>, response: Response) => {
  try {
    const auth = await getAuth();
    const headers = await toAuthHeaders(request.headers);
    const webResponse = await auth.api.signInEmail({
      body: {
        email: request.body.email,
        password: request.body.password,
      },
      headers,
      asResponse: true,
    });
    if (!webResponse.ok) {
      throw new UnauthorizedError(null);
    }
    copySetCookie(webResponse, response);
  } catch (err) {
    logger.error(err, "Error logging in");
    if (err instanceof UnauthorizedError) {
      throw err;
    }
    throw new UnauthorizedError(err);
  }
};

const logout = async (request: Request, response: Response) => {
  try {
    const auth = await getAuth();
    const headers = await toAuthHeaders(request.headers);
    const session = await auth.api.getSession({ headers });
    if (!session) {
      throw new UnauthorizedError(null);
    }
    const webResponse = await auth.api.signOut({
      headers,
      asResponse: true,
    });
    copySetCookie(webResponse, response);
  } catch (err) {
    logger.error(err, "Error logging out");
    throw err;
  }
};

const validateUserSession = async (request: Request) => {
  try {
    const auth = await getAuth();
    const headers = await toAuthHeaders(request.headers);
    const session = await auth.api.getSession({ headers });
    if (!session) {
      throw new UnauthorizedError(null);
    }
    return session;
  } catch (err) {
    logger.error(err, "Error validating user session");
    throw err;
  }
};

const getCurrentUser = async (request: Request, response: Response) => {
  try {
    const auth = await getAuth();
    const headers = await toAuthHeaders(request.headers);
    const webResponse = await auth.api.getSession({
      headers,
      asResponse: true,
    });
    const data = (await webResponse.json()) as {
      session?: { updatedAt: string; expiresAt: string };
      user?: { id: string };
    } | null;
    if (!data?.session || !data.user) {
      throw new UnauthorizedError(null);
    }
    let user;
    try {
      user = await userModel.findOneById(data.user.id);
    } catch (err) {
      if (err instanceof NotFoundError) {
        throw new UnauthorizedError(err);
      }
      throw err;
    }
    copySetCookie(webResponse, response);
    return {
      session: {
        updated_at: new Date(data.session.updatedAt).toISOString(),
        expires_at: new Date(data.session.expiresAt).toISOString(),
      },
      user: {
        username: user.username,
        email: user.email,
        permission: user.permission,
        updated_at: user.updated_at.toISOString(),
      },
    };
  } catch (err) {
    logger.error(err, "Error getting session user");
    throw err;
  }
};

export const sessionModel = {
  validateUserSession,
  getCurrentUser,
  login,
  logout,
};

export default sessionModel;
