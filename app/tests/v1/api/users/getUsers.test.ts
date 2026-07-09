import { DB_POOL } from "infra/database/database";
import { waitForServices } from "infra/scripts/waitForServices";
import { createUser, getUserByUsername } from "./utils";

describe("GET /v1/users/:username", () => {
  let client: any;

  beforeAll(async () => {
    await waitForServices();
  });
  describe("Successful response", () => {
    beforeEach(async () => {
      client = await DB_POOL.connect();
      try {
        await client.query("TRUNCATE TABLE users CASCADE;");
      } finally {
        client.release();
      }
    });

    it("Gets a user by username and return a 200 response", async () => {
      const user1 = {
        username: "user1",
        email: "user1@gmail.com",
        password: "user1234",
      };

      await createUser(user1);

      const userGetResponse = await getUserByUsername(user1.username);
      const userGetResponseBody = await userGetResponse.json();

      expect(userGetResponse.status).toBe(200);
      expect(userGetResponseBody).toEqual({
        username: user1.username,
        email: user1.email,
        permission: null,
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });
      expect(userGetResponseBody).not.toHaveProperty("password");
      expect(userGetResponseBody).not.toHaveProperty("id");
    });
    it("Throws an error when the username doesn't exist", async () => {
      const userGetResponse = await getUserByUsername("test_username!");
      const userGetResponseBody = await userGetResponse.json();
      expect(userGetResponse.status).toBe(404);
      expect(userGetResponseBody).toEqual({
        name: "not_found_error",
        message: "User not found",
        status_code: 404,
        action: "Check the username and try again.",
      });
    });
    it("Gets a user by username (case insensitive) and return a 200 response", async () => {
      const user1 = {
        username: "user1",
        email: "user1@gmail.com",
        password: "user1234",
      };

      await createUser(user1);

      const userGetResponse = await getUserByUsername("UsEr1");
      const userGetResponseBody = await userGetResponse.json();

      expect(userGetResponse.status).toBe(200);
      expect(userGetResponseBody).toEqual({
        username: user1.username,
        email: user1.email,
        permission: null,
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });
      expect(userGetResponseBody).not.toHaveProperty("password");
      expect(userGetResponseBody).not.toHaveProperty("id");
    });
  });
  afterAll(async () => {
    await DB_POOL.end();
  });
});
