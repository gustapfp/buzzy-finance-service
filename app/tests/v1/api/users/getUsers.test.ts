import { DB_POOL } from "infra/database/database";
import { waitForServices } from "infra/scripts/waitForServices";
import {
  createUser,
  getUserByUsername,
  applyMigrations,
  cleanDatabase,
  loginUser,
  extractSessionCookie,
} from "../utils";
import { PERMISSIONS } from "infra/auth/authorization";

describe("GET /v1/user/:username", () => {
  let client: any;

  beforeAll(async () => {
    await waitForServices();
  });
  describe("Successful response", () => {
    beforeEach(async () => {
      client = await DB_POOL.connect();

      try {
        await cleanDatabase(client);
        await applyMigrations();
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
      const loginResponse = await loginUser({ email: user1.email, password: user1.password });
      const cookie = extractSessionCookie(loginResponse);

      const userGetResponse = await getUserByUsername(user1.username, cookie);
      const userGetResponseBody = await userGetResponse.json();

      expect(userGetResponse.status).toBe(200);
      expect(userGetResponseBody).toEqual({
        username: user1.username,
        email: user1.email,
        permission: [PERMISSIONS.READ_OWN_TOKEN],
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });
      expect(userGetResponseBody).not.toHaveProperty("password");
      expect(userGetResponseBody).not.toHaveProperty("id");
    });
    it("Throws an error when not authenticated", async () => {
      const userGetResponse = await getUserByUsername("test_username!");
      const userGetResponseBody = await userGetResponse.json();
      expect(userGetResponse.status).toBe(401);
      expect(userGetResponseBody).toEqual({
        name: "unauthorized",
        message: "User Unauthorized to do this operation.",
        status_code: 401,
        action: "Please try to login again or if you're facing any issue contact the support team.",
      });
    });
    it("Gets a user by username (case insensitive) and return a 200 response", async () => {
      const user1 = {
        username: "user1",
        email: "user1@gmail.com",
        password: "user1234",
      };

      await createUser(user1);
      const loginResponse = await loginUser({ email: user1.email, password: user1.password });
      const cookie = extractSessionCookie(loginResponse);

      const userGetResponse = await getUserByUsername("UsEr1", cookie);
      const userGetResponseBody = await userGetResponse.json();

      expect(userGetResponse.status).toBe(200);
      expect(userGetResponseBody).toEqual({
        username: user1.username,
        email: user1.email,
        permission: [PERMISSIONS.READ_OWN_TOKEN],
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
