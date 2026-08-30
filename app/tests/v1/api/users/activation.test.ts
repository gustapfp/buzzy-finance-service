import { DB, DB_POOL } from "infra/database/database";
import { waitForServices } from "infra/scripts/waitForServices";
import { createUser, applyMigrations, cleanDatabase, deleteAllEmails, getLastEmail } from "../utils";
import { User } from "api/v1/users/types";
import { activationManager } from "infra/auth/activation";
import { sendUserActivationEmail } from "api/v1/users/helpers";
import { ACTIVATION_TOKEN_EXPIRES_AT } from "infra/auth/consts";
import { ServiceUnavailableError } from "infra/errors/ServiceUnavailable";

describe("User activation", () => {
  let client: any;

  const seedUser = {
    username: "activationuser",
    email: "activationuser@gmail.com",
    password: "activation1234",
  };

  beforeAll(async () => {
    await waitForServices();
  });

  const getUserRowByUsername = async (username: string): Promise<User> => {
    const result = await DB.query(`SELECT * FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1;`, [username]);
    return result.rows[0];
  };

  const getActivationTokensForUser = async (userId: string) => {
    const result = await DB.query(`SELECT * FROM user_activation_tokens WHERE user_id = $1;`, [userId]);
    return result.rows;
  };

  describe("Migration: user_activation_tokens table", () => {
    beforeEach(async () => {
      client = await DB_POOL.connect();
      try {
        await cleanDatabase(client);
        await applyMigrations();
      } finally {
        client.release();
      }
    });

    it("Creates the table with the expected columns", async () => {
      const result = await DB.query(
        `SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = $1;`,
        ["user_activation_tokens"],
      );
      const columns = Object.fromEntries(result.rows.map((row: any) => [row.column_name, row.is_nullable]));

      expect(columns).toEqual({
        id: "NO",
        user_id: "NO",
        used_at: "YES",
        expires_at: "NO",
        created_at: "NO",
        updated_at: "NO",
      });
    });

    it("Deletes activation tokens when the referenced user is deleted (ON DELETE CASCADE)", async () => {
      await createUser(seedUser);
      const user = await getUserRowByUsername(seedUser.username);

      await activationManager.createActivationToken(user.id);
      expect(await getActivationTokensForUser(user.id)).not.toHaveLength(0);

      await DB.query(`DELETE FROM users WHERE id = $1;`, [user.id]);

      expect(await getActivationTokensForUser(user.id)).toHaveLength(0);
    });
  });

  describe("activationManager.createActivationToken", () => {
    beforeEach(async () => {
      client = await DB_POOL.connect();
      try {
        await cleanDatabase(client);
        await applyMigrations();
      } finally {
        client.release();
      }
      await createUser(seedUser);
    });

    it("Creates a token row linked to the user with a 15 minute expiration", async () => {
      const user = await getUserRowByUsername(seedUser.username);
      const beforeCreate = Date.now();

      const token = await activationManager.createActivationToken(user.id);

      expect(token.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(token.user_id).toBe(user.id);
      expect(token.used_at).toBeNull();
      expect(new Date(token.expires_at).getTime()).toBeGreaterThan(beforeCreate + ACTIVATION_TOKEN_EXPIRES_AT - 5000);
      expect(new Date(token.expires_at).getTime()).toBeLessThan(beforeCreate + ACTIVATION_TOKEN_EXPIRES_AT + 5000);

      const rows = await getActivationTokensForUser(user.id);
      expect(rows.map((row: any) => row.id)).toContain(token.id);
    });

    it("Rejects when user_id does not reference an existing user", async () => {
      await expect(activationManager.createActivationToken("00000000-0000-0000-0000-000000000000")).rejects.toThrow(
        ServiceUnavailableError,
      );
    });
  });

  describe("activationManager.sendTokenToUserEmail", () => {
    beforeEach(async () => {
      client = await DB_POOL.connect();
      try {
        await cleanDatabase(client);
        await applyMigrations();
      } finally {
        client.release();
      }
      await createUser(seedUser);
    });

    it("Sends an activation email containing the token id", async () => {
      const user = await getUserRowByUsername(seedUser.username);
      const token = await activationManager.createActivationToken(user.id);

      await deleteAllEmails();
      await activationManager.sendTokenToUserEmail(user, token);
      const lastEmail = await getLastEmail();

      expect(lastEmail.subject).toBe("Ative a sua conta na Buzzy Finance");
      expect(lastEmail.recipients[0]).toBe(`<${user.email}>`);
      expect(lastEmail.text).toContain(token.id);
    });
  });

  describe("sendUserActivationEmail", () => {
    beforeEach(async () => {
      client = await DB_POOL.connect();
      try {
        await cleanDatabase(client);
        await applyMigrations();
      } finally {
        client.release();
      }
      await createUser(seedUser);
    });

    it("Creates an activation token and emails it to the user", async () => {
      const user = await getUserRowByUsername(seedUser.username);
      const tokensBefore = await getActivationTokensForUser(user.id);

      await deleteAllEmails();
      await sendUserActivationEmail(user);

      const tokensAfter = await getActivationTokensForUser(user.id);
      expect(tokensAfter).toHaveLength(tokensBefore.length + 1);
      const newToken = tokensAfter.find(
        (token: any) => !tokensBefore.some((existing: any) => existing.id === token.id),
      );

      const lastEmail = await getLastEmail();
      expect(lastEmail.recipients[0]).toBe(`<${user.email}>`);
      expect(lastEmail.text).toContain(newToken.id);
    });
  });

  describe("userModel.createUser end-to-end", () => {
    beforeEach(async () => {
      client = await DB_POOL.connect();
      try {
        await cleanDatabase(client);
        await applyMigrations();
      } finally {
        client.release();
      }
    });

    it("Creates an activation token and sends an activation email on signup", async () => {
      await deleteAllEmails();

      const response = await createUser(seedUser);
      expect(response.status).toBe(201);

      const user = await getUserRowByUsername(seedUser.username);
      const tokens = await getActivationTokensForUser(user.id);
      expect(tokens).toHaveLength(1);
      expect(tokens[0].used_at).toBeNull();

      const lastEmail = await getLastEmail();
      expect(lastEmail.subject).toBe("Ative a sua conta na Buzzy Finance");
      expect(lastEmail.recipients[0]).toBe(`<${user.email}>`);
      expect(lastEmail.text).toContain(tokens[0].id);
    });
  });

  afterAll(async () => {
    await DB_POOL.end();
  });
});
