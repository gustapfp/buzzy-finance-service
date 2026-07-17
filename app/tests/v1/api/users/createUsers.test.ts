import { DB, DB_POOL } from "infra/database/database";
import { waitForServices } from "infra/scripts/waitForServices";
import { createUser } from "./utils";
import { applyMigrations, cleanDatabase } from "../utils";
import { User } from "api/v1/users/types";
import { authManager } from "infra/auth/authManager";

describe("POST /v1/users", () => {
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

    it("Creates a new user and return a 201 response", async () => {
      const user1 = {
        username: "user1",
        email: "user1@gmail.com",
        password: "user1234",
      };

      const userResponse = await createUser(user1);
      const userResponseBody = await userResponse.json();
      expect(userResponse.status).toBe(201);
      expect(userResponseBody).toEqual({
        username: user1.username,
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });
      expect(userResponseBody).not.toHaveProperty("password");
      expect(userResponseBody).not.toHaveProperty("id");
      expect(userResponseBody).not.toHaveProperty("email");
    });
    it("Throws an error when the username already exists", async () => {
      const user1 = {
        username: "user1",
        email: "user1@gmail.com",
        password: "user1234",
      };
      const User1 = {
        username: "User1",
        email: "User1@gmail.com",
        password: "user1234",
      };
      const user1Response = await createUser(user1);
      expect(user1Response.status).toBe(201);
      const User1Response = await createUser(User1);
      expect(User1Response.status).toBe(422);
    });
  });
  describe("Validates Authentication", () => {
    it("Password must be encrypted", async () => {
      const user1 = {
        username: "user1",
        email: "user1@gmail.com",
        password: "user1234",
      };

      await createUser(user1);

      const result = await DB.query(
        `
        SELECT *
        FROM users
        WHERE
          LOWER(username) = LOWER($1)
        LIMIT
          1;
        `,
        [user1.username],
      );
      const user: User = result.rows[0];

      expect(user.password).not.toBe(user1.password);
      expect(await authManager.comparePassword(user1.password, user.password)).toBe(true);
    });
  });
  afterAll(async () => {
    await DB_POOL.end();
  });
});
