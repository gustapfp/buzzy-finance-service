import { DB_POOL } from "infra/database/database";
import { waitForServices } from "infra/scripts/waitForServices";
import { applyMigrations, cleanDatabase } from "../utils";
import { todo } from "node:test";
describe("POST /v1/users", () => {
  let client: any;

  beforeAll(async () => {
    await waitForServices();
  });
  describe("Successful Session Creation", () => {
    beforeEach(async () => {
      client = await DB_POOL.connect();
      try {
        await cleanDatabase(client);
        await applyMigrations();
      } finally {
        client.release();
      }
    });
    todo("Create a new session and returns a 200 when the user is registers");
    todo("Validate the session and returns a 200");
    todo("Sets session token in the cookie when the session is created");
    todo("checks if the use agent and timezone is correct in the creation of the session and if its returns a 200");
    todo("if useragent or timezone it not provide request user to login again");
    todo("if the session is expired it request user to login again");
    todo("if the use agente is not the same as the one in the db it request user to login again");
    todo("if the timezone is not the same as the one in the db it request user to login again");
    todo("if its not able to find the cookie request users to login again");
    todo("if its");
  });
  afterAll(async () => {
    await DB_POOL.end();
  });
});
