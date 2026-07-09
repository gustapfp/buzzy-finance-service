import { Client } from "pg";

const MIGRATIONS_URL = `${process.env.BASE_URL}/api/v1/migrations`;

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
