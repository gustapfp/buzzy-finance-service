import { DB, DB_POOL } from "infra/database/database";
import { waitForServices } from "infra/scripts/waitForServices";
import {
  createUser,
  applyMigrations,
  cleanDatabase,
  deleteAllEmails,
  getLastEmail,
  activateUser,
  loginUser,
  extractSessionCookie,
  getUserByUsername,
} from "../utils";
import { User } from "api/v1/users/types";
import { activationManager } from "infra/auth/activation";
import { sendUserActivationEmail } from "api/v1/users/helpers";
import { ACTIVATION_TOKEN_EXPIRES_AT } from "infra/auth/consts";
import { ServiceUnavailableError } from "infra/errors/ServiceUnavailable";
import { PERMISSIONS } from "infra/auth/authorization";

const ACTIVATE_URL = `${process.env.BASE_URL}/api/v1/user/activate`;

describe("User activation", () => {
  let client: any;

  const seedUser = {
    username: "activationuser",
    email: "activationuser@gmail.com",
    password: "activation1234",
  };

  const seedUserB = {
    username: "activationuserb",
    email: "activationuserb@gmail.com",
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

  const extractActivationLink = (emailText: string): string => {
    const match = emailText.match(/https?:\/\/\S+\/register\/activate\?token=\S+/);
    if (!match) {
      throw new Error(`No activation link found in email text: ${emailText}`);
    }
    return match[0];
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
        token: "NO",
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
      expect(lastEmail.text).toContain(token.token);
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
      expect(lastEmail.text).toContain(newToken.token);
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
      expect(lastEmail.text).toContain(tokens[0].token);
    });
  });

  describe("PATCH /user/activate — link/URL shape", () => {
    beforeEach(async () => {
      client = await DB_POOL.connect();
      try {
        await cleanDatabase(client);
        await applyMigrations();
      } finally {
        client.release();
      }
    });

    it("Activation email link matches the expected shape exactly", async () => {
      await deleteAllEmails();
      await createUser(seedUser);

      const user = await getUserRowByUsername(seedUser.username);
      const [token] = await getActivationTokensForUser(user.id);

      const lastEmail = await getLastEmail();
      const link = extractActivationLink(lastEmail.text);

      expect(link).toBe(`${process.env.WEBAPP_URL}/register/activate?token=${encodeURIComponent(token.token)}`);
      expect(new URL(link).searchParams.get("token")).toBe(token.token);
    });

    it("Activation link does not leak the user's email or username", async () => {
      await deleteAllEmails();
      await createUser(seedUser);

      const user = await getUserRowByUsername(seedUser.username);
      const lastEmail = await getLastEmail();
      const link = extractActivationLink(lastEmail.text);

      expect(link).not.toContain(user.email);
      expect(link).not.toContain(user.username);
    });
  });

  describe("PATCH /user/activate — end-to-end happy path", () => {
    beforeEach(async () => {
      client = await DB_POOL.connect();
      try {
        await cleanDatabase(client);
        await applyMigrations();
      } finally {
        client.release();
      }
    });

    it("Activates a real user via the emailed link and sets CREATE_OWN_SESSION", async () => {
      await deleteAllEmails();
      await createUser(seedUser);

      const lastEmail = await getLastEmail();
      const link = extractActivationLink(lastEmail.text);
      const token = new URL(link).searchParams.get("token")!;

      const response = await activateUser(token);
      expect(response.status).toBe(200);

      const user = await getUserRowByUsername(seedUser.username);
      expect(user.permission).toEqual([PERMISSIONS.CREATE_OWN_SESSION]);

      const [tokenRow] = await getActivationTokensForUser(user.id);
      expect(tokenRow.used_at).not.toBeNull();
    });
  });

  describe("PATCH /user/activate — permission enforcement (deferred)", () => {
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

    // TODO: unskip once authManager.authenticate checks CREATE_OWN_SESSION (deferred follow-up task)
    it.skip("Login fails before activation and succeeds after", async () => {
      const preLogin = await loginUser({ email: seedUser.email, password: seedUser.password });
      expect(preLogin.status).toBe(401);

      const user = await getUserRowByUsername(seedUser.username);
      const [tokenRow] = await getActivationTokensForUser(user.id);
      await activateUser(tokenRow.token);

      const postLogin = await loginUser({ email: seedUser.email, password: seedUser.password });
      expect(postLogin.status).toBe(200);

      const cookie = extractSessionCookie(postLogin);
      const protectedResponse = await getUserByUsername(seedUser.username, cookie);
      expect(protectedResponse.status).toBe(200);
    });
  });

  describe("PATCH /user/activate — exploit / abuse cases", () => {
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

    it("Replay: reusing an already-consumed   token returns 404 and does not change permissions again", async () => {
      const user = await getUserRowByUsername(seedUser.username);
      const [tokenRow] = await getActivationTokensForUser(user.id);

      const first = await activateUser(tokenRow.token);
      expect(first.status).toBe(200);

      const userAfterFirst = await getUserRowByUsername(seedUser.username);
      const [tokenAfterFirst] = await getActivationTokensForUser(user.id);

      const replay = await activateUser(tokenRow.token);
      expect(replay.status).toBe(404);

      const userAfterReplay = await getUserRowByUsername(seedUser.username);
      const [tokenAfterReplay] = await getActivationTokensForUser(user.id);

      expect(userAfterReplay.permission).toEqual([PERMISSIONS.CREATE_OWN_SESSION]);
      expect(userAfterReplay.permission).toEqual(userAfterFirst.permission);
      expect(tokenAfterReplay.used_at).toEqual(tokenAfterFirst.used_at);
    });

    it("Expired token: force-expiring a real token causes activation to fail with 404", async () => {
      const user = await getUserRowByUsername(seedUser.username);
      const [tokenRow] = await getActivationTokensForUser(user.id);

      await DB.query(
        `UPDATE user_activation_tokens SET expires_at = timezone('utc', now()) - interval '1 minute' WHERE id = $1;`,
        [tokenRow.id],
      );

      const response = await activateUser(tokenRow.token);
      expect(response.status).toBe(404);

      const userAfter = await getUserRowByUsername(seedUser.username);
      expect(userAfter.permission).toEqual([PERMISSIONS.READ_OWN_TOKEN]);

      const [tokenAfter] = await getActivationTokensForUser(user.id);
      expect(tokenAfter.used_at).toBeNull();
    });

    it("Malformed token fails cleanly with 404, not a 500", async () => {
      const response = await activateUser("not-a-token");
      expect(response.status).toBe(404);

      const body = (await response.json()) as { name: string; status_code: number };
      expect(body.name).toBe("not_found_error");
      expect(body.status_code).toBe(404);
      expect(JSON.stringify(body)).not.toMatch(/invalid input syntax/i);
    });

    it.each(["' OR '1'='1", "'; DROP TABLE user_activation_tokens; --"])(
      "SQL-injection-style payload %s fails cleanly with 404 and does not damage data",
      async (payload) => {
        const user = await getUserRowByUsername(seedUser.username);
        const [legitToken] = await getActivationTokensForUser(user.id);

        const response = await activateUser(payload);
        expect(response.status).toBe(404);
        const body = await response.json();
        expect(body.name).toBe("not_found_error");

        const tableExists = await DB.query(`SELECT to_regclass('public.user_activation_tokens') AS table_name;`);
        expect(tableExists.rows[0].table_name).toBe("user_activation_tokens");

        const [tokenAfter] = await getActivationTokensForUser(user.id);
        expect(tokenAfter.id).toBe(legitToken.id);
        expect(tokenAfter.used_at).toBeNull();

        const finalActivation = await activateUser(legitToken.token);
        expect(finalActivation.status).toBe(200);
      },
    );

    it("Missing token query param returns a clean 404, not a 500", async () => {
      const response = await fetch(ACTIVATE_URL, { method: "PATCH" });
      expect(response.status).toBe(404);
    });

    it("GET is rejected via catchNotAllowedMethods (405) and does not consume the token", async () => {
      const user = await getUserRowByUsername(seedUser.username);
      const [tokenRow] = await getActivationTokensForUser(user.id);

      const getResponse = await fetch(`${ACTIVATE_URL}?${new URLSearchParams({ token: tokenRow.token })}`, {
        method: "GET",
      });
      expect(getResponse.status).toBe(405);
      const body = await getResponse.json();
      expect(body.name).toBe("method_not_allowed");

      const [tokenAfterGet] = await getActivationTokensForUser(user.id);
      expect(tokenAfterGet.used_at).toBeNull();

      const patchResponse = await activateUser(tokenRow.token);
      expect(patchResponse.status).toBe(200);
    });

    it("Cross-account isolation: activating user A's token does not affect user B", async () => {
      await createUser(seedUserB);

      const userA = await getUserRowByUsername(seedUser.username);
      const userB = await getUserRowByUsername(seedUserB.username);
      const [tokenA] = await getActivationTokensForUser(userA.id);
      const [tokenB] = await getActivationTokensForUser(userB.id);

      const response = await activateUser(tokenA.token);
      expect(response.status).toBe(200);

      const userAAfter = await getUserRowByUsername(seedUser.username);
      const userBAfter = await getUserRowByUsername(seedUserB.username);
      const [tokenBAfter] = await getActivationTokensForUser(userB.id);

      expect(userAAfter.permission).toEqual([PERMISSIONS.CREATE_OWN_SESSION]);
      expect(userBAfter.permission).toEqual([PERMISSIONS.READ_OWN_TOKEN]);
      expect(tokenBAfter.used_at).toBeNull();
      expect(tokenBAfter.id).toBe(tokenB.id);
    });
  });

  afterAll(async () => {
    await DB_POOL.end();
  });
});
