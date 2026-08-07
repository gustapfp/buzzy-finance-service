import { DB, DB_POOL } from "infra/database/database";
import { waitForServices } from "infra/scripts/waitForServices";
import { createUser, updateUser, applyMigrations, cleanDatabase, loginUser, extractSessionCookie } from "../utils";
import { User } from "api/v1/users/types";
import { authManager } from "infra/auth/authManager";

describe("PUT /v1/user/:username", () => {
  let client: any;
  let cookie: string;

  const seedUser = {
    username: "user1",
    email: "user1@gmail.com",
    password: "user1234",
  };

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
      await createUser(seedUser);
      const loginResponse = await loginUser({ email: seedUser.email, password: seedUser.password });
      cookie = extractSessionCookie(loginResponse);
    });

    it("Updates the username and returns a 200 response", async () => {
      const response = await updateUser(
        seedUser.username,
        {
          current_username: seedUser.username,
          username: "newUsername",
        },
        cookie,
      );
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body).toEqual({
        username: "newUsername",
        email: seedUser.email,
        permission: null,
        updated_at: expect.any(String),
      });
    });

    it("Updates the email and returns a 200 response", async () => {
      const response = await updateUser(
        seedUser.username,
        {
          current_username: seedUser.username,
          email: "newemail@gmail.com",
        },
        cookie,
      );
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body).toEqual({
        username: seedUser.username,
        email: "newemail@gmail.com",
        permission: null,
        updated_at: expect.any(String),
      });
    });

    it("Updates the password and returns a 200 response", async () => {
      const response = await updateUser(
        seedUser.username,
        {
          current_username: seedUser.username,
          password: "newPassword123",
        },
        cookie,
      );
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body).toEqual({
        username: seedUser.username,
        email: seedUser.email,
        permission: null,
        updated_at: expect.any(String),
      });
      expect(body).not.toHaveProperty("password");
    });

    it("Updates the permission and returns a 200 response", async () => {
      const response = await updateUser(
        seedUser.username,
        {
          current_username: seedUser.username,
          permission: "ADMIN",
        },
        cookie,
      );
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body).toEqual({
        username: seedUser.username,
        email: seedUser.email,
        permission: "ADMIN",
        updated_at: expect.any(String),
      });
    });

    it("Updates multiple fields at once", async () => {
      const response = await updateUser(
        seedUser.username,
        {
          current_username: seedUser.username,
          username: "updatedUser",
          email: "updated@gmail.com",
          permission: "USER",
        },
        cookie,
      );
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body).toEqual({
        username: "updatedUser",
        email: "updated@gmail.com",
        permission: "USER",
        updated_at: expect.any(String),
      });
    });

    it("Does not return sensitive fields in the response", async () => {
      const response = await updateUser(
        seedUser.username,
        {
          current_username: seedUser.username,
          username: "safeUser",
        },
        cookie,
      );
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body).not.toHaveProperty("password");
      expect(body).not.toHaveProperty("id");
    });

    it("Updates updated_at timestamp", async () => {
      const beforeUpdate = await DB.query(`SELECT updated_at FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1;`, [
        seedUser.username,
      ]);
      const originalTimestamp = beforeUpdate.rows[0].updated_at;

      // Small delay to ensure timestamp differs
      await new Promise((resolve) => setTimeout(resolve, 50));

      await updateUser(
        seedUser.username,
        {
          current_username: seedUser.username,
          username: "timestampUser",
        },
        cookie,
      );

      const afterUpdate = await DB.query(`SELECT updated_at FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1;`, [
        "timestampUser",
      ]);
      const newTimestamp = afterUpdate.rows[0].updated_at;

      expect(new Date(newTimestamp).getTime()).toBeGreaterThan(new Date(originalTimestamp).getTime());
    });
  });

  describe("Validation errors", () => {
    beforeEach(async () => {
      client = await DB_POOL.connect();
      try {
        await cleanDatabase(client);
        await applyMigrations();
      } finally {
        client.release();
      }
      await createUser(seedUser);
      await createUser({
        username: "user2",
        email: "user2@gmail.com",
        password: "user2234",
      });
      const loginResponse = await loginUser({ email: seedUser.email, password: seedUser.password });
      cookie = extractSessionCookie(loginResponse);
    });

    it("Throws an error when updating to an existing username", async () => {
      const response = await updateUser(
        seedUser.username,
        {
          current_username: seedUser.username,
          username: "user2",
        },
        cookie,
      );
      expect(response.status).toBe(422);
    });

    it("Throws an error when updating to an existing email", async () => {
      const response = await updateUser(
        seedUser.username,
        {
          current_username: seedUser.username,
          email: "user2@gmail.com",
        },
        cookie,
      );
      expect(response.status).toBe(422);
    });

    it("Username uniqueness check is case-insensitive", async () => {
      const response = await updateUser(
        seedUser.username,
        {
          current_username: seedUser.username,
          username: "User2",
        },
        cookie,
      );
      expect(response.status).toBe(422);
    });
  });

  describe("Validates Authentication", () => {
    beforeEach(async () => {
      client = await DB_POOL.connect();
      try {
        await cleanDatabase(client);
        await applyMigrations();
      } finally {
        client.release();
      }
      await createUser(seedUser);
      const loginResponse = await loginUser({ email: seedUser.email, password: seedUser.password });
      cookie = extractSessionCookie(loginResponse);
    });

    it("New password must be encrypted", async () => {
      const newPassword = "newSecurePassword";
      await updateUser(
        seedUser.username,
        {
          current_username: seedUser.username,
          password: newPassword,
        },
        cookie,
      );

      const result = await DB.query(`SELECT * FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1;`, [
        seedUser.username,
      ]);
      const user: User = result.rows[0];

      expect(user.password).not.toBe(newPassword);
      expect(user.password).toMatch(/^\$2[aby]\$\d{2}\$.{53}$/);
      expect(await authManager.comparePassword(newPassword, user.password)).toBe(true);
      await expect(authManager.comparePassword(seedUser.password, user.password)).rejects.toThrow();
    });

    it("Password is not re-hashed when not provided in update", async () => {
      const beforeUpdate = await DB.query(`SELECT password FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1;`, [
        seedUser.username,
      ]);
      const originalHash = beforeUpdate.rows[0].password;

      await updateUser(
        seedUser.username,
        {
          current_username: seedUser.username,
          username: "renamedUser",
        },
        cookie,
      );

      const afterUpdate = await DB.query(`SELECT password FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1;`, [
        "renamedUser",
      ]);
      const updatedHash = afterUpdate.rows[0].password;

      expect(updatedHash).toBe(originalHash);
    });
  });

  describe("Error handling", () => {
    beforeEach(async () => {
      client = await DB_POOL.connect();
      try {
        await cleanDatabase(client);
        await applyMigrations();
      } finally {
        client.release();
      }
    });

    it("Returns an error when the user does not exist", async () => {
      const response = await updateUser("nonExistentUser", {
        current_username: "nonExistentUser",
        username: "newName",
      });
      expect(response.status).not.toBe(200);
    });
  });

  afterAll(async () => {
    await DB_POOL.end();
  });
});
