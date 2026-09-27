import { DB, DB_POOL } from "infra/database/database";
import { mailManager } from "infra/email/mailManager";
import { PERMISSIONS } from "infra/auth/authorization";
import { SET_USER_PERMISSIONS_STATEMENT } from "api/v1/users/consts";
import type { IncomingHttpHeaders } from "http";
import type { Response } from "express";

const createAuth = async () => {
  const { betterAuth } = await import("better-auth");
  const secret = process.env.BETTER_AUTH_SECRET;
  const baseURL = process.env.BASE_URL;
  if (!secret || !baseURL) {
    throw new Error("BETTER_AUTH_SECRET and BASE_URL are required");
  }

  return betterAuth({
    secret,
    baseURL,
    database: DB_POOL,
    emailAndPassword: {
      enabled: true,
      autoSignIn: false,
      requireEmailVerification: true,
    },
    emailVerification: {
      expiresIn: 900,
      sendVerificationEmail: async ({ user, token }) => {
        const activationLink = `${process.env.WEBAPP_URL}/register/activate?token=${encodeURIComponent(token)}`;
        await mailManager.sendEmail({
          from: process.env.EMAIL_SENDER || "",
          to: user.email,
          subject: "Ative a sua conta na Buzzy Finance",
          text:
            "Olá " +
            user.name +
            ",\n\nPor favor, ative a sua conta clicando no seguinte link:\n\n" +
            activationLink +
            "\n\n Nos vemos logo. Muito Obrigado!",
        });
      },
      afterEmailVerification: async (user) => {
        await DB.query(SET_USER_PERMISSIONS_STATEMENT, [user.name, [PERMISSIONS.CREATE_OWN_SESSION]]);
      },
    },
    user: {
      modelName: "users",
      fields: {
        name: "username",
        emailVerified: "email_verified",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
    },
    session: {
      expiresIn: 2592000,
      updateAge: 0,
      modelName: "session",
      fields: {
        expiresAt: "expires_at",
        createdAt: "created_at",
        updatedAt: "updated_at",
        ipAddress: "ip_address",
        userAgent: "user_agent",
        userId: "user_id",
      },
    },
    account: {
      modelName: "account",
      fields: {
        accountId: "account_id",
        providerId: "provider_id",
        userId: "user_id",
        accessToken: "access_token",
        refreshToken: "refresh_token",
        idToken: "id_token",
        accessTokenExpiresAt: "access_token_expires_at",
        refreshTokenExpiresAt: "refresh_token_expires_at",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
    },
    verification: {
      modelName: "verification",
      fields: {
        expiresAt: "expires_at",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
    },
    advanced: {
      database: {
        generateId: "uuid",
      },
      defaultCookieAttributes: {
        sameSite: "strict",
      },
    },
  });
};

let authPromise: ReturnType<typeof createAuth> | undefined;

export const getAuth = () => {
  authPromise ??= createAuth();
  return authPromise;
};

export const toAuthHeaders = async (headers: IncomingHttpHeaders) => {
  const { fromNodeHeaders } = await import("better-auth/node");
  return fromNodeHeaders(headers);
};

export const copySetCookie = (from: globalThis.Response, to: Response) => {
  const cookies = from.headers.getSetCookie();
  if (cookies.length > 0) {
    to.setHeader("Set-Cookie", cookies);
  }
};
