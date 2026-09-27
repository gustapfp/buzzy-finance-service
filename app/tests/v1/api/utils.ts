import { Client } from "pg";
import { randomUUID } from "crypto";
import type { LoginResponseBody } from "api/v1/session/types";

const MIGRATIONS_URL = `${process.env.BASE_URL}/api/v1/migrations`;
const USERS_ENDPOINT_URL = `${process.env.BASE_URL}/api/v1/user`;
const SESSION_ENDPOINT_URL = `${process.env.BASE_URL}/api/v1/session`;

const EMAIL_URL = `http://${process.env.EMAIL_HTTP_HOST}:${process.env.EMAIL_HTTP_PORT}`;
export const cleanDatabase = async (client: Client): Promise<void> => {
  await client.query("DROP SCHEMA IF EXISTS public CASCADE;");
  await client.query("CREATE SCHEMA public;");
};

export const applyMigrations = async (): Promise<void> => {
  const response = await fetch(MIGRATIONS_URL, { method: "POST" });
  if (!response.ok) {
    throw new Error(`Failed to apply migrations: ${response.status}`);
  }
};

const randomId = (): string => randomUUID().replace(/-/g, "").slice(0, 12);

const createRandomUser = async (): Promise<any> => {
  const id = randomId();
  return {
    email: `user-${id}@test.com`,
    username: `user-${id}`,
    password: `Pass!${id}`,
  };
};

export const createUser = async (body: any, withFaker = false) => {
  if (withFaker) {
    body = await createRandomUser();
  }
  return await fetch(USERS_ENDPOINT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
};

export const getUserByUsername = async (username: string, cookie?: string, userAgent = "jest-test-agent") => {
  return await fetch(`${USERS_ENDPOINT_URL}/${username}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": userAgent,
      ...(cookie && { Cookie: cookie }),
    },
  });
};

export const loginUser = async (credentials: { email: string; password: string }, userAgent = "jest-test-agent") => {
  return await fetch(`${SESSION_ENDPOINT_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": userAgent },
    body: JSON.stringify(credentials),
  });
};

export const UNAUTHORIZED_BODY = {
  name: "unauthorized",
  message: "User Unauthorized to do this operation.",
  action: "Please try to login again or if you're facing any issue contact the support team.",
  status_code: 401,
};

export const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export const extractSessionCookie = (response: Response): string => {
  const cookies = response.headers.getSetCookie?.() ?? [];
  const session = cookies.find((cookie) => cookie.includes("better-auth.session_token="));
  const setCookie = session ?? response.headers.get("set-cookie") ?? "";
  return setCookie.split(";")[0] ?? "";
};

type CaughtEmail = {
  id: string;
  subject: string;
  sender: string;
  recipients: string[];
  text: string;
};

export const listEmails = async (): Promise<CaughtEmail[]> => {
  const emailListResponse = await fetch(`${EMAIL_URL}/messages`);
  return (await emailListResponse.json()) as CaughtEmail[];
};

export const activationTokenFromEmail = (text: string): string => {
  const match = text.match(/https?:\/\/\S+/);
  const link = match?.[0];
  if (!link) {
    throw new Error("Activation link missing");
  }
  return new URL(link).searchParams.get("token") ?? "";
};

export const getCurrentUser = async (
  cookie?: string,
  headers: Record<string, string> = { "User-Agent": "jest-test-agent" },
) => {
  return await fetch(USERS_ENDPOINT_URL, {
    method: "GET",
    headers: {
      ...headers,
      ...(cookie ? { Cookie: cookie } : {}),
    },
  });
};

export const resendActivation = async (email: string) => {
  return await fetch(`${USERS_ENDPOINT_URL}/activate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
};

export const registerAndActivate = async (body: { username: string; email: string; password: string }) => {
  await deleteAllEmails();
  const created = await createUser(body);
  const email = await getLastEmail();
  const token = activationTokenFromEmail(email.text);
  const activated = await activateUser(token);
  return { created, email, token, activated };
};

export const parseLoginBody = async (response: Response): Promise<LoginResponseBody> => {
  return (await response.json()) as LoginResponseBody;
};

export const activateUser = async (token: string, userAgent = "jest-test-agent") => {
  return await fetch(`${USERS_ENDPOINT_URL}/activate?${new URLSearchParams({ token })}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": userAgent,
    },
  });
};

export const updateUser = async (username: string, body: any, cookie?: string, userAgent = "jest-test-agent") => {
  return await fetch(`${USERS_ENDPOINT_URL}/${username}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": userAgent,
      ...(cookie && { Cookie: cookie }),
    },
    body: JSON.stringify(body),
  });
};

export const deleteAllEmails = async () => {
  await fetch(`${EMAIL_URL}/messages`, {
    method: "DELETE",
  });
};

export const getLastEmail = async () => {
  const emailListResponse = await fetch(`${EMAIL_URL}/messages`);
  const emailListBody = (await emailListResponse.json()) as CaughtEmail[];
  const lastEmailItem = emailListBody.pop();
  if (!lastEmailItem) {
    throw new Error("No email");
  }

  const emailTextResponse = await fetch(`${EMAIL_URL}/messages/${lastEmailItem.id}.plain`);
  const emailTextBody = await emailTextResponse.text();

  lastEmailItem.text = emailTextBody;
  return lastEmailItem;
};
