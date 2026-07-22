import { Client } from "pg";
import { randomUUID } from "crypto";

const MIGRATIONS_URL = `${process.env.BASE_URL}/api/v1/migrations`;
const USERS_ENDPOINT_URL = `${process.env.BASE_URL}/api/v1/users`;

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

export const getUserByUsername = async (username: string) => {
  return await fetch(`${USERS_ENDPOINT_URL}/${username}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
};

export const updateUser = async (username: string, body: any) => {
  return await fetch(`${USERS_ENDPOINT_URL}/${username}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
};
