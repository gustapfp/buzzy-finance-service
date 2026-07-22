import { DB, DB_POOL } from "infra/database/database";
import { waitForServices } from "infra/scripts/waitForServices";
import { createUser, applyMigrations, cleanDatabase } from "../utils";
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
      expect(user.password).toMatch(/^\$2[aby]\$\d{2}\$.{53}$/);
      expect(await authManager.comparePassword(user1.password, user.password)).toBe(true);
      expect(await authManager.comparePassword("hashed password", user.password)).toBe(false);
    });
    it("Rejects empty password", async () => {
      const response = await createUser({ username: "user1", email: "user1@gmail.com", password: "" });
      expect(response.status).not.toBe(201);
    });
    it("Stored hash is not the plain password with pepper", async () => {
      const user1 = { username: "user1", email: "user1@gmail.com", password: "user1234" };
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
      const storedHash = result.rows[0].password;
      expect(storedHash).not.toBe(`${user1.password}.${process.env.APP_SECRET}`);
      expect(storedHash).not.toContain(user1.password);
    });
    it("Not generate same hash with the same password", async () => {
      const user1 = {
        username: "user1",
        email: "user1@gmail.com",
        password: "user1234",
      };
      const user2 = {
        username: "user2",
        email: "user2@gmail.com",
        password: "user1234",
      };
      await createUser(user1);
      await createUser(user2);
      const result1 = await DB.query(
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
      const result2 = await DB.query(
        `
        SELECT *
        FROM users
        WHERE
          LOWER(username) = LOWER($1)
        LIMIT
          1;
        `,
        [user2.username],
      );
      const user1Hash = result1.rows[0].password;
      const user2Hash = result2.rows[0].password;
      expect(user1Hash).not.toBe(user2Hash);
    });
  });
  afterAll(async () => {
    await DB_POOL.end();
  });
});
