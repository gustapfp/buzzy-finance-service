import { DB, DB_POOL } from "infra/database/database";
import { waitForServices } from "infra/scripts/waitForServices";
import {
  createUser,
  applyMigrations,
  cleanDatabase,
  deleteAllEmails,
  getLastEmail,
  listEmails,
  loginUser,
  ISO_TIMESTAMP,
  UNAUTHORIZED_BODY,
  activationTokenFromEmail,
} from "../utils";

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
        SELECT account.password
        FROM account
        JOIN users ON users.id = account.user_id
        WHERE
          LOWER(users.username) = LOWER($1)
        LIMIT
          1;
        `,
        [user1.username],
      );
      const storedHash = result.rows[0].password;

      expect(storedHash).not.toBe(user1.password);
      expect(storedHash).not.toBe(`${user1.password}.${process.env.APP_SECRET}`);
      expect(storedHash).not.toContain(user1.password);
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
        SELECT account.password
        FROM account
        JOIN users ON users.id = account.user_id
        WHERE
          LOWER(users.username) = LOWER($1)
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
      const hashFor = async (username: string) => {
        const result = await DB.query(
          `
          SELECT account.password
          FROM account
          JOIN users ON users.id = account.user_id
          WHERE
            LOWER(users.username) = LOWER($1)
          LIMIT
            1;
          `,
          [username],
        );
        return result.rows[0].password;
      };
      expect(await hashFor(user1.username)).not.toBe(await hashFor(user2.username));
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

    it("C1 signup returns 201 without a cookie and stores an empty permission", async () => {
      const user1 = { username: "user1", email: "User1@gmail.com", password: "user1234" };
      const userResponse = await createUser(user1);
      const userResponseBody = await userResponse.json();

      expect(userResponse.status).toBe(201);
      expect(userResponseBody).toEqual({
        username: user1.username,
        created_at: expect.stringMatching(ISO_TIMESTAMP),
        updated_at: expect.stringMatching(ISO_TIMESTAMP),
      });
      expect(userResponseBody).not.toHaveProperty("password");
      expect(userResponseBody).not.toHaveProperty("email");
      expect(userResponseBody).not.toHaveProperty("id");
      expect(userResponseBody).not.toHaveProperty("permission");
      expect(userResponse.headers.get("set-cookie")).toBeNull();

      const stored = await DB.query(`SELECT email, permission FROM users WHERE username = $1`, [user1.username]);
      expect(stored.rows[0].permission).toEqual([]);
      expect(stored.rows[0].email).toBe(user1.email.toLowerCase());
    });

    it("C2 login before activation returns 401 without a cookie", async () => {
      const user1 = { username: "user1", email: "user1@gmail.com", password: "user1234" };
      await createUser(user1);
      const loginResponse = await loginUser({ email: user1.email, password: user1.password });
      const body = await loginResponse.json();
      expect(loginResponse.status).toBe(401);
      expect(body).toEqual(UNAUTHORIZED_BODY);
      expect(loginResponse.headers.get("set-cookie")).toBeNull();
    });

    it("C3 signup sends the activation email", async () => {
      const user1 = { username: "user1", email: "User1@gmail.com", password: "user1234" };
      await createUser(user1);
      const emails = await listEmails();
      expect(emails).toHaveLength(1);
      const email = await getLastEmail();
      const token = activationTokenFromEmail(email.text);
      const link = `${process.env.WEBAPP_URL}/register/activate?token=${encodeURIComponent(token)}`;
      expect(email.subject).toBe("Ative a sua conta na Buzzy Finance");
      expect(email.text.replace(/\r\n/g, "\n").trimEnd()).toBe(
        `Olá ${user1.username},\n\nPor favor, ative a sua conta clicando no seguinte link:\n\n${link}\n\n Nos vemos logo. Muito Obrigado!`,
      );
      const payloadPart = token.split(".")[1] ?? "";
      const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8")) as {
        email?: string;
        username?: string;
        iat: number;
        exp: number;
      };
      expect(payload.email).toBe(user1.email.toLowerCase());
      expect(payload).not.toHaveProperty("username");
      expect(Math.abs(payload.exp - (payload.iat + 900))).toBeLessThanOrEqual(2);
    });

    it.each([
      ["C4 duplicate email returns 422 and stores nothing", { username: "other", email: "User1@gmail.com" }, "email"],
      [
        "C4 duplicate username returns 422 and stores nothing",
        { username: "User1", email: "other@gmail.com" },
        "username",
      ],
      [
        "C4 duplicate email and username returns 422 and stores nothing",
        { username: "User1", email: "User1@gmail.com" },
        "email,username",
      ],
    ])("%s", async (_name, duplicate, fields) => {
      await createUser({ username: "user1", email: "user1@gmail.com", password: "user1234" });
      await deleteAllEmails();
      const before = await DB.query(`SELECT count(*)::int AS count FROM users`, []);
      const response = await createUser({ ...duplicate, password: "user1234" });
      const body = await response.json();
      const after = await DB.query(`SELECT count(*)::int AS count FROM users`, []);
      expect(response.status).toBe(422);
      expect(body).toEqual({
        name: "validation_error",
        message: `These fields are not valid: ${fields}`,
        action: "Fix the provided fields and try again.",
        status_code: 422,
      });
      expect(after.rows[0].count).toBe(before.rows[0].count);
      expect(await listEmails()).toHaveLength(0);
    });

    it("C4 two signups for the same email return one 201 and one 422", async () => {
      const [first, second] = await Promise.all([
        createUser({ username: "racea", email: "race@gmail.com", password: "user1234" }),
        createUser({ username: "raceb", email: "Race@gmail.com", password: "user1234" }),
      ]);
      const bodies = await Promise.all([first.json(), second.json()]);
      const statuses = [first.status, second.status].sort((left, right) => left - right);
      expect(statuses).toEqual([201, 422]);
      const rejected = bodies[first.status === 422 ? 0 : 1];
      expect(rejected).toEqual({
        name: "validation_error",
        message: "These fields are not valid: email",
        action: "Fix the provided fields and try again.",
        status_code: 422,
      });
      const count = await DB.query(`SELECT count(*)::int AS count FROM users`, []);
      expect(count.rows[0].count).toBe(1);
      const stored = await DB.query(`SELECT username FROM users`, []);
      const created = bodies[first.status === 201 ? 0 : 1] as { username: string };
      expect(created.username).toBe(stored.rows[0].username);
    });
  });
  afterAll(async () => {
    await DB_POOL.end();
  });
});
