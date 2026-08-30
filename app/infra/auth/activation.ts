import { User } from "api/v1/users/types";
import { DB } from "infra/database/database";
import { mailManager } from "infra/email/mailManager";
import { ACTIVATION_TOKEN_EXPIRES_AT, CREATE_ACTIVATION_TOKEN_STATEMENT } from "./consts";
import { ActivationToken } from "./types";

const createActivationToken = async (user_id: string): Promise<ActivationToken> => {
  const expiresAt = new Date(Date.now() + ACTIVATION_TOKEN_EXPIRES_AT);
  const activationToken = await DB.query(CREATE_ACTIVATION_TOKEN_STATEMENT, [user_id, expiresAt]);
  return activationToken.rows[0];
};

const sendTokenToUserEmail = async (user: User, token: ActivationToken) => {
  return mailManager.sendEmail({
    from: process.env.EMAIL_SENDER || "",
    to: user.email,
    subject: "Ative a sua conta na Buzzy Finance",
    text:
      "Olá " +
      user.username +
      ",\n\nPor favor, ative a sua conta clicando no seguinte link:\n\n" +
      process.env.WEBAPP_URL +
      "register/activate?token=" +
      token.id +
      "\n\n Nos vemos logo. Muito Obrigado!",
  });
};

export const activationManager = { sendTokenToUserEmail, createActivationToken };
