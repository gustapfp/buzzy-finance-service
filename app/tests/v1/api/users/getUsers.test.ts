import { DB_POOL } from "infra/database/database";
import { waitForServices } from "infra/scripts/waitForServices";
import {
  getUserByUsername,
  applyMigrations,
  cleanDatabase,
  loginUser,
  extractSessionCookie,
  registerAndActivate,
  ISO_TIMESTAMP,
  UNAUTHORIZED_BODY,
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

    it("C21 get user by username with a cookie returns 200", async () => {
      const user1 = {
        username: "user1",
        email: "user1@gmail.com",
        password: "user1234",
      };

      await registerAndActivate(user1);
      const loginResponse = await loginUser({ email: user1.email, password: user1.password });
      const cookie = extractSessionCookie(loginResponse);

      const userGetResponse = await getUserByUsername(user1.username, cookie);
      const userGetResponseBody = await userGetResponse.json();

      expect(userGetResponse.status).toBe(200);
      expect(userGetResponseBody).toEqual({
        username: user1.username,
        email: user1.email,
        permission: [PERMISSIONS.CREATE_OWN_SESSION],
        created_at: expect.stringMatching(ISO_TIMESTAMP),
        updated_at: expect.stringMatching(ISO_TIMESTAMP),
      });
      expect(userGetResponseBody).not.toHaveProperty("password");
      expect(userGetResponseBody).not.toHaveProperty("id");
    });
    it("C21 get user by username without a cookie returns 401", async () => {
      const userGetResponse = await getUserByUsername("test_username!");
      const userGetResponseBody = await userGetResponse.json();
      expect(userGetResponse.status).toBe(401);
      expect(userGetResponseBody).toEqual(UNAUTHORIZED_BODY);
    });
    it("Gets a user by username (case insensitive) and return a 200 response", async () => {
      const user1 = {
        username: "user1",
        email: "user1@gmail.com",
        password: "user1234",
      };

      await registerAndActivate(user1);
      const loginResponse = await loginUser({ email: user1.email, password: user1.password });
      const cookie = extractSessionCookie(loginResponse);

      const userGetResponse = await getUserByUsername("UsEr1", cookie);
      const userGetResponseBody = await userGetResponse.json();

      expect(userGetResponse.status).toBe(200);
      expect(userGetResponseBody).toEqual({
        username: user1.username,
        email: user1.email,
        permission: [PERMISSIONS.CREATE_OWN_SESSION],
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
