import { DB, DB_POOL } from "infra/database/database";
import { waitForServices } from "infra/scripts/waitForServices";
import {
  createUser,
  updateUser,
  applyMigrations,
  cleanDatabase,
  loginUser,
  extractSessionCookie,
  registerAndActivate,
  getCurrentUser,
  deleteAllEmails,
  listEmails,
  ISO_TIMESTAMP,
  UNAUTHORIZED_BODY,
} from "../utils";
import { Permission, PERMISSIONS } from "infra/auth/authorization";
import userModel from "api/v1/users/model";
import { NotFoundError } from "infra/errors/NotFoundError";
import { PermissionError } from "infra/errors/PermissionError";

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
        updated_at: expect.any(String),
      });
      expect(body).not.toHaveProperty("password");
    });

    it("Ignores a permission field in the payload and does not change stored permissions", async () => {
      const response = await updateUser(
        seedUser.username,
        {
          current_username: seedUser.username,
          permission: "create:invoice:own",
        },
        cookie,
      );
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body).toEqual({
        username: seedUser.username,
        email: seedUser.email,
        updated_at: expect.any(String),
      });

      const result = await DB.query(`SELECT permission FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1;`, [
        seedUser.username,
      ]);
      expect(result.rows[0].permission).toEqual([]);
    });

    it("Updates multiple fields at once", async () => {
      const response = await updateUser(
        seedUser.username,
        {
          current_username: seedUser.username,
          username: "updatedUser",
          email: "updated@gmail.com",
        },
        cookie,
      );
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body).toEqual({
        username: "updatedUser",
        email: "updated@gmail.com",
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

      const result = await DB.query(
        `SELECT account.password FROM account JOIN users ON users.id = account.user_id WHERE LOWER(users.username) = LOWER($1) LIMIT 1;`,
        [seedUser.username],
      );
      const storedHash = result.rows[0].password;

      expect(storedHash).not.toBe(newPassword);
      expect(storedHash).not.toBe(`${newPassword}.${process.env.APP_SECRET}`);
      expect(storedHash).not.toContain(newPassword);
    });

    it("Password is not re-hashed when not provided in update", async () => {
      const beforeUpdate = await DB.query(
        `SELECT account.password FROM account JOIN users ON users.id = account.user_id WHERE LOWER(users.username) = LOWER($1) LIMIT 1;`,
        [seedUser.username],
      );
      const originalHash = beforeUpdate.rows[0].password;

      await updateUser(
        seedUser.username,
        {
          current_username: seedUser.username,
          username: "renamedUser",
        },
        cookie,
      );

      const afterUpdate = await DB.query(
        `SELECT account.password FROM account JOIN users ON users.id = account.user_id WHERE LOWER(users.username) = LOWER($1) LIMIT 1;`,
        ["renamedUser"],
      );
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

  describe("userModel.addUserPermission / removeUserPermission", () => {
    beforeEach(async () => {
      client = await DB_POOL.connect();
      try {
        await cleanDatabase(client);
        await applyMigrations();
      } finally {
        client.release();
      }
      await createUser(seedUser);
      await DB.query(`UPDATE users SET permission = $2 WHERE username = $1`, [
        seedUser.username,
        [PERMISSIONS.READ_OWN_TOKEN],
      ]);
    });

    describe("addUserPermission", () => {
      it("Adds a new permission and returns the updated user", async () => {
        const updatedUser = await userModel.addUserPermission(seedUser.username, PERMISSIONS.READ_OWN_SESSION);

        expect(updatedUser).not.toBeNull();
        expect(updatedUser!.permission).toEqual(
          expect.arrayContaining([PERMISSIONS.READ_OWN_TOKEN, PERMISSIONS.READ_OWN_SESSION]),
        );
        expect(updatedUser!.permission).toHaveLength(2);

        const result = await DB.query(`SELECT permission FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1;`, [
          seedUser.username,
        ]);
        expect(result.rows[0].permission).toEqual(
          expect.arrayContaining([PERMISSIONS.READ_OWN_TOKEN, PERMISSIONS.READ_OWN_SESSION]),
        );
      });

      it("Returns null and leaves the array unchanged when the user already has the permission", async () => {
        const result = await userModel.addUserPermission(seedUser.username, PERMISSIONS.READ_OWN_TOKEN);
        expect(result).toBeNull();

        const dbResult = await DB.query(`SELECT permission FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1;`, [
          seedUser.username,
        ]);
        expect(dbResult.rows[0].permission).toEqual([PERMISSIONS.READ_OWN_TOKEN]);
      });

      it("Throws NotFoundError when the user does not exist", async () => {
        await expect(userModel.addUserPermission("nonExistentUser", PERMISSIONS.READ_OWN_SESSION)).rejects.toThrow(
          NotFoundError,
        );
      });

      it("Throws PermissionError for a well-formed permission that isn't defined in the PERMISSIONS catalog", async () => {
        const undocumentedPermission: Permission = "delete:token:any";
        await expect(userModel.addUserPermission(seedUser.username, undocumentedPermission)).rejects.toThrow(
          PermissionError,
        );

        const dbResult = await DB.query(`SELECT permission FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1;`, [
          seedUser.username,
        ]);
        expect(dbResult.rows[0].permission).toEqual([PERMISSIONS.READ_OWN_TOKEN]);
      });

      it("Throws PermissionError when a non-string value is passed", async () => {
        await expect(userModel.addUserPermission(seedUser.username, 12345 as unknown as Permission)).rejects.toThrow(
          PermissionError,
        );
      });

      it("Throws PermissionError when permission is undefined", async () => {
        await expect(
          userModel.addUserPermission(seedUser.username, undefined as unknown as Permission),
        ).rejects.toThrow(PermissionError);
      });
    });

    describe("removeUserPermission", () => {
      it("Removes an existing permission and returns the updated user", async () => {
        const updatedUser = await userModel.removeUserPermission(seedUser.username, PERMISSIONS.READ_OWN_TOKEN);

        expect(updatedUser).not.toBeNull();
        expect(updatedUser!.permission).toEqual([]);
      });

      it("Returns null and leaves the array unchanged when the user doesn't have the permission", async () => {
        const result = await userModel.removeUserPermission(seedUser.username, PERMISSIONS.READ_OWN_SESSION);
        expect(result).toBeNull();

        const dbResult = await DB.query(`SELECT permission FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1;`, [
          seedUser.username,
        ]);
        expect(dbResult.rows[0].permission).toEqual([PERMISSIONS.READ_OWN_TOKEN]);
      });

      it("Throws NotFoundError when the user does not exist", async () => {
        await expect(userModel.removeUserPermission("nonExistentUser", PERMISSIONS.READ_OWN_TOKEN)).rejects.toThrow(
          NotFoundError,
        );
      });

      it("Throws PermissionError for a well-formed permission that isn't defined in the PERMISSIONS catalog", async () => {
        const undocumentedPermission: Permission = "delete:token:any";
        await expect(userModel.removeUserPermission(seedUser.username, undocumentedPermission)).rejects.toThrow(
          PermissionError,
        );
      });

      it("Removes every occurrence if the same permission was stored more than once", async () => {
        await DB.query(`UPDATE users SET permission = permission || $2 WHERE LOWER(username) = LOWER($1);`, [
          seedUser.username,
          [PERMISSIONS.READ_OWN_TOKEN],
        ]);
        const before = await DB.query(`SELECT permission FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1;`, [
          seedUser.username,
        ]);
        expect(before.rows[0].permission).toEqual([PERMISSIONS.READ_OWN_TOKEN, PERMISSIONS.READ_OWN_TOKEN]);

        const updatedUser = await userModel.removeUserPermission(seedUser.username, PERMISSIONS.READ_OWN_TOKEN);
        expect(updatedUser!.permission).toEqual([]);
      });
    });
  });

  describe("Criteria", () => {
    beforeEach(async () => {
      client = await DB_POOL.connect();
      try {
        await cleanDatabase(client);
        await applyMigrations();
        await deleteAllEmails();
      } finally {
        client.release();
      }
    });

    it("C19 password change keeps the current session and drops the other", async () => {
      await registerAndActivate(seedUser);
      const firstLogin = await loginUser({ email: seedUser.email, password: seedUser.password });
      const secondLogin = await loginUser({ email: seedUser.email, password: seedUser.password }, "other-agent");
      const currentCookie = extractSessionCookie(firstLogin);
      const otherCookie = extractSessionCookie(secondLogin);
      const newPassword = "newPassword123";

      const response = await updateUser(seedUser.username, { password: newPassword }, currentCookie);
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body).toEqual({
        username: seedUser.username,
        email: seedUser.email,
        updated_at: expect.stringMatching(ISO_TIMESTAMP),
      });
      expect(body).not.toHaveProperty("password");

      const newLogin = await loginUser({ email: seedUser.email, password: newPassword });
      const newLoginBody = await newLogin.json();
      const sessionCookie = newLogin.headers
        .getSetCookie()
        .find((cookie) => cookie.startsWith("better-auth.session_token="));
      expect(newLogin.status).toBe(200);
      expect(newLoginBody).toEqual({});
      expect(newLoginBody).not.toHaveProperty("session_token");
      expect(newLoginBody).not.toHaveProperty("password");
      expect(sessionCookie).toContain("HttpOnly");
      expect(sessionCookie).toContain("Path=/");
      expect(sessionCookie).toContain("Max-Age=2592000");
      expect(sessionCookie).not.toMatch(/;\s*Secure(?:;|$)/);

      const oldLogin = await loginUser({ email: seedUser.email, password: seedUser.password });
      expect(oldLogin.status).toBe(401);
      expect(await oldLogin.json()).toEqual(UNAUTHORIZED_BODY);
      expect(oldLogin.headers.get("set-cookie")).toBeNull();

      const current = await getCurrentUser(currentCookie);
      expect(current.status).toBe(200);
      const other = await getCurrentUser(otherCookie, { "User-Agent": "other-agent" });
      expect(other.status).toBe(401);
      expect(await other.json()).toEqual(UNAUTHORIZED_BODY);
    });

    it("C20 username update sends no email and keeps sessions", async () => {
      await registerAndActivate(seedUser);
      await deleteAllEmails();
      const firstLogin = await loginUser({ email: seedUser.email, password: seedUser.password });
      const secondLogin = await loginUser({ email: seedUser.email, password: seedUser.password }, "other-agent");
      const response = await updateUser(seedUser.username, { username: "renamed" }, extractSessionCookie(firstLogin));
      const body = await response.json();
      const stored = await DB.query(`SELECT email FROM users WHERE username = $1`, ["renamed"]);
      expect(response.status).toBe(200);
      expect(body).toEqual({
        username: "renamed",
        email: stored.rows[0].email,
        updated_at: expect.stringMatching(ISO_TIMESTAMP),
      });
      expect(body).not.toHaveProperty("password");
      expect(await listEmails()).toHaveLength(0);
      expect((await getCurrentUser(extractSessionCookie(firstLogin))).status).toBe(200);
      expect((await getCurrentUser(extractSessionCookie(secondLogin), { "User-Agent": "other-agent" })).status).toBe(
        200,
      );
    });

    it("C20 email update sends no email and keeps sessions", async () => {
      await registerAndActivate(seedUser);
      await deleteAllEmails();
      const firstLogin = await loginUser({ email: seedUser.email, password: seedUser.password });
      const secondLogin = await loginUser({ email: seedUser.email, password: seedUser.password }, "other-agent");
      const response = await updateUser(
        seedUser.username,
        { email: "Renamed@gmail.com" },
        extractSessionCookie(firstLogin),
      );
      const body = (await response.json()) as {
        username: string;
        email: string;
        updated_at: string;
        password?: string;
      };
      const stored = await DB.query(`SELECT email FROM users WHERE username = $1`, [seedUser.username]);
      expect(response.status).toBe(200);
      expect(body).toEqual({
        username: seedUser.username,
        email: stored.rows[0].email,
        updated_at: expect.stringMatching(ISO_TIMESTAMP),
      });
      expect(body).not.toHaveProperty("password");
      expect(await listEmails()).toHaveLength(0);
      expect((await getCurrentUser(extractSessionCookie(firstLogin))).status).toBe(200);
      expect((await getCurrentUser(extractSessionCookie(secondLogin), { "User-Agent": "other-agent" })).status).toBe(
        200,
      );
    });
  });

  afterAll(async () => {
    await DB_POOL.end();
  });
});
