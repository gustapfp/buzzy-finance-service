import { User } from "api/v1/users/types";
import { DB } from "infra/database/database";
import { mailManager } from "infra/email/mailManager";
import {
  ACTIVATION_TOKEN_EXPIRES_AT,
  CREATE_ACTIVATION_TOKEN_STATEMENT,
  VALIDATE_ACTIVATION_TOKEN_STATEMENT,
} from "./consts";
import { ActivationToken } from "./types";
import { logger } from "api/utils/logger";

const createActivationToken = async (user_id: string): Promise<ActivationToken> => {
  const expiresAt = new Date(Date.now() + ACTIVATION_TOKEN_EXPIRES_AT);
  const activationToken = await DB.query(CREATE_ACTIVATION_TOKEN_STATEMENT, [user_id, expiresAt]);
  return activationToken.rows[0];
};

const sendTokenToUserEmail = async (user: User, token: ActivationToken) => {
  const activationLink =
    `${process.env.WEBAPP_URL}/register/activate?token=${encodeURIComponent(token.token)}` +
    `&email=${encodeURIComponent(user.email)}`;

  return mailManager.sendEmail({
    from: process.env.EMAIL_SENDER || "",
    to: user.email,
    subject: "Ative a sua conta na Buzzy Finance",
    text:
      "Olá " +
      user.username +
      ",\n\nPor favor, ative a sua conta clicando no seguinte link:\n\n" +
      activationLink +
      "\n\n Nos vemos logo. Muito Obrigado!",
  });
};

const activateUserToken = async (token: string, user_id: string): Promise<ActivationToken | null> => {
  try {
    const activationToken = await DB.query(VALIDATE_ACTIVATION_TOKEN_STATEMENT, [token, user_id]);
    return activationToken.rows[0];
  } catch (error) {
    logger.error(error, "Error validating activation token");
    return null;
  }
};

export const activationManager = { sendTokenToUserEmail, createActivationToken, activateUserToken };
