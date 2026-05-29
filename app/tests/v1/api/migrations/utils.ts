import { Client } from "pg";

export const cleanDatabase = async (client: Client): Promise<void> => {
  await client.query("drop schema public cascade;");
  await client.query("CREATE SCHEMA public;");
};
