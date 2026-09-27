import { ServiceUnavailableError } from "infra/errors/ServiceUnavailable";
import nodemailer from "nodemailer";
import { SendEmailOptions } from "./types";

const TRANSPORTER = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.NODE_ENV === "production",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});
const validateTransporterConnection = async () => {
  try {
    await TRANSPORTER.verify();
  } catch (err) {
    throw new ServiceUnavailableError(err, "SMTPMailer");
  }
};

const sendEmail = async (options: SendEmailOptions) => {
  try {
    validateTransporterConnection();
    const mailInfo = await TRANSPORTER.sendMail({
      from: options.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    return mailInfo;
  } catch (err) {
    throw new ServiceUnavailableError(err, "SMTPMailer");
  }
};

export const mailManager = { sendEmail };
