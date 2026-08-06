import { Client } from "pg";
import { randomUUID } from "crypto";
import type { LoginResponseBody } from "api/v1/session/types";

const MIGRATIONS_URL = `${process.env.BASE_URL}/api/v1/migrations`;
const USERS_ENDPOINT_URL = `${process.env.BASE_URL}/api/v1/users`;
const SESSION_ENDPOINT_URL = `${process.env.BASE_URL}/api/v1/session`;

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

export const extractSessionCookie = (response: Response): string => {
  const setCookie = response.headers.get("set-cookie") || "";
  return setCookie.split(";")[0] ?? "";
};

export const parseLoginBody = async (response: Response): Promise<LoginResponseBody> => {
  return (await response.json()) as LoginResponseBody;
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
