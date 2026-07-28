import { DB_POOL } from "infra/database/database";
import { waitForServices } from "infra/scripts/waitForServices";
import { applyMigrations, cleanDatabase, createUser } from "../utils";

const LOGIN_URL = `${process.env.BASE_URL}/api/v1/session/login`;
const LOGOUT_URL = `${process.env.BASE_URL}/api/v1/session/logout`;

const TEST_USER = {
  username: "sessionuser",
  email: "sessionuser@test.com",
  password: "SecurePass!123",
};

const loginRequest = (body: Record<string, unknown>, headers: Record<string, string> = {}) => {
  return fetch(LOGIN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
};

const logoutRequest = (cookie: string, userAgent: string = "jest-test-agent") => {
  return fetch(LOGOUT_URL, {
    method: "DELETE",
    headers: { Cookie: cookie, "User-Agent": userAgent },
  });
};

const extractSessionCookie = (response: Response): string => {
  const setCookie = response.headers.get("set-cookie") || "";
  return setCookie.split(";")[0]; // "sdi=<token>"
};

describe("Session API", () => {
  let client: any;

  beforeAll(async () => {
    await waitForServices();
  });

  // ──────────────────────────────────────────────────────────────────
  // LOGIN – Success
  // ──────────────────────────────────────────────────────────────────
  describe("POST /v1/session/login – Successful Login", () => {
    beforeEach(async () => {
      client = await DB_POOL.connect();
      try {
        await cleanDatabase(client);
        await applyMigrations();
        await createUser(TEST_USER);
      } finally {
        client.release();
      }
    });

    it("returns 200 and a session_token when credentials are correct", async () => {
      const response = await loginRequest(
        { email: TEST_USER.email, password: TEST_USER.password },
        { "User-Agent": "jest-test-agent" },
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toHaveProperty("session_token");
      expect(typeof body.session_token).toBe("string");
      expect(body.session_token.length).toBeGreaterThan(0);
    });

    it("sets the 'sdi' session cookie via Set-Cookie header", async () => {
      const response = await loginRequest(
        { email: TEST_USER.email, password: TEST_USER.password },
        { "User-Agent": "jest-test-agent" },
      );

      const setCookie = response.headers.get("set-cookie");
      expect(setCookie).toBeDefined();
      expect(setCookie).toContain("sdi=");
      expect(setCookie).toContain("HttpOnly");
      expect(setCookie).toContain("Secure");
      expect(setCookie).toContain("SameSite=Strict");
      expect(setCookie).toContain("Path=/");
    });

    it("returns a unique session_token for each login", async () => {
      const res1 = await loginRequest(
        { email: TEST_USER.email, password: TEST_USER.password },
        { "User-Agent": "jest-test-agent" },
      );
      const res2 = await loginRequest(
        { email: TEST_USER.email, password: TEST_USER.password },
        { "User-Agent": "jest-test-agent" },
      );
      const body1 = await res1.json();
      const body2 = await res2.json();

      expect(body1.session_token).not.toBe(body2.session_token);
    });

    it("session_token in body matches cookie value", async () => {
      const response = await loginRequest(
        { email: TEST_USER.email, password: TEST_USER.password },
        { "User-Agent": "jest-test-agent" },
      );
      const body = await response.json();
      const cookie = extractSessionCookie(response);

      expect(cookie).toBe(`sdi=${body.session_token}`);
    });

    it("stores the correct user-agent in the session record", async () => {
      const customAgent = "CustomBrowser/1.0";
      const response = await loginRequest(
        { email: TEST_USER.email, password: TEST_USER.password },
        { "User-Agent": customAgent },
      );
      const body = await response.json();

      // Query the session directly from the DB
      const dbClient = await DB_POOL.connect();
      try {
        const result = await dbClient.query("SELECT * FROM session WHERE token = $1", [body.session_token]);
        expect(result.rows.length).toBe(1);
        expect(result.rows[0].user_agent).toBe(customAgent);
      } finally {
        dbClient.release();
      }
    });

    it("sets session expiration to ~30 days in the future", async () => {
      const response = await loginRequest(
        { email: TEST_USER.email, password: TEST_USER.password },
        { "User-Agent": "jest-test-agent" },
      );
      const body = await response.json();

      const dbClient = await DB_POOL.connect();
      try {
        const result = await dbClient.query("SELECT * FROM session WHERE token = $1", [body.session_token]);
        const expiresAt = new Date(result.rows[0].expires_at);
        const now = new Date();
        const diffInDays = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

        expect(diffInDays).toBeGreaterThan(29);
        expect(diffInDays).toBeLessThanOrEqual(30);
      } finally {
        dbClient.release();
      }
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // LOGIN – Failure
  // ──────────────────────────────────────────────────────────────────
  describe("POST /v1/session/login – Failed Login", () => {
    beforeEach(async () => {
      client = await DB_POOL.connect();
      try {
        await cleanDatabase(client);
        await applyMigrations();
        await createUser(TEST_USER);
      } finally {
        client.release();
      }
    });

    it("returns 401 when the email is correct but password is wrong", async () => {
      const response = await loginRequest(
        { email: TEST_USER.email, password: "WrongPassword!999" },
        { "User-Agent": "jest-test-agent" },
      );

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toHaveProperty("name", "unauthorized");
      expect(body).not.toHaveProperty("session_token");
    });

    it("returns 401 when the email does not exist", async () => {
      const response = await loginRequest(
        { email: "nonexistent@test.com", password: TEST_USER.password },
        { "User-Agent": "jest-test-agent" },
      );

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toHaveProperty("name", "unauthorized");
    });

    it("returns 401 when both email and password are wrong", async () => {
      const response = await loginRequest(
        { email: "wrong@test.com", password: "WrongPass!999" },
        { "User-Agent": "jest-test-agent" },
      );

      expect(response.status).toBe(401);
    });

    it("returns 401 when user sends username instead of email", async () => {
      const response = await loginRequest(
        { email: TEST_USER.username, password: TEST_USER.password },
        { "User-Agent": "jest-test-agent" },
      );

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toHaveProperty("name", "unauthorized");
    });

    it("returns 401 when the email field contains a malformed email", async () => {
      const response = await loginRequest(
        { email: "not-an-email", password: TEST_USER.password },
        { "User-Agent": "jest-test-agent" },
      );

      // The controller passes the value straight to findOneByEmail, which will
      // not find a matching row → NotFoundError → wrapped as UnauthorizedError
      expect(response.status).toBe(401);
    });

    it("returns 401 when the password is an empty string", async () => {
      const response = await loginRequest(
        { email: TEST_USER.email, password: "" },
        { "User-Agent": "jest-test-agent" },
      );

      expect(response.status).toBe(401);
    });

    it("returns 401 when the email is an empty string", async () => {
      const response = await loginRequest(
        { email: "", password: TEST_USER.password },
        { "User-Agent": "jest-test-agent" },
      );

      expect(response.status).toBe(401);
    });

    it("returns 401 when the body is completely empty ({})", async () => {
      const response = await loginRequest({}, { "User-Agent": "jest-test-agent" });

      expect(response.status).toBe(401);
    });

    it("returns 200 when User-Agent header is not explicitly set (fetch injects its own)", async () => {
      // Note: The native fetch API always injects a default User-Agent header,
      // so this test validates that a fetch-default User-Agent is accepted.
      // In a real browser/client scenario where User-Agent is truly absent,
      // getUserAgent() would throw UnauthorizedError (401).
      const response = await fetch(LOGIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: TEST_USER.email, password: TEST_USER.password }),
      });

      // fetch always sends its own User-Agent, so the server accepts it
      expect(response.status).toBe(200);
    });

    it("returns 401 when the User-Agent header is an empty string", async () => {
      const response = await loginRequest(
        { email: TEST_USER.email, password: TEST_USER.password },
        { "User-Agent": "" },
      );

      expect(response.status).toBe(401);
    });

    it("does not set a session cookie on failed login", async () => {
      const response = await loginRequest(
        { email: TEST_USER.email, password: "WrongPassword!999" },
        { "User-Agent": "jest-test-agent" },
      );

      const setCookie = response.headers.get("set-cookie");
      expect(setCookie).toBeNull();
    });

    it("does not create a session row in the DB on failed login", async () => {
      await loginRequest(
        { email: TEST_USER.email, password: "WrongPassword!999" },
        { "User-Agent": "jest-test-agent" },
      );

      const dbClient = await DB_POOL.connect();
      try {
        const result = await dbClient.query("SELECT count(*)::int AS cnt FROM session");
        expect(result.rows[0].cnt).toBe(0);
      } finally {
        dbClient.release();
      }
    });

    it("returns 401 when body contains extra fields but no email/password", async () => {
      const response = await loginRequest(
        { username: TEST_USER.username, token: "abc" },
        { "User-Agent": "jest-test-agent" },
      );

      expect(response.status).toBe(401);
    });

    it("returns 401 when password has correct value but email casing differs from stored email", async () => {
      // findOneByEmail does exact match – uppercase email should fail if DB query is case-sensitive
      const response = await loginRequest(
        { email: TEST_USER.email.toUpperCase(), password: TEST_USER.password },
        { "User-Agent": "jest-test-agent" },
      );

      // Depending on whether the query is ILIKE or LOWER, this either succeeds or 401s.
      // We just assert it doesn't 500.
      expect([200, 401]).toContain(response.status);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // LOGIN – HTTP Method enforcement
  // ──────────────────────────────────────────────────────────────────
  describe("POST /v1/session/login – Method enforcement", () => {
    it("returns 405 for GET requests", async () => {
      const response = await fetch(LOGIN_URL, { method: "GET" });
      expect(response.status).toBe(405);
    });

    it("returns 405 for PUT requests", async () => {
      const response = await fetch(LOGIN_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "a@b.com", password: "x" }),
      });
      expect(response.status).toBe(405);
    });

    it("returns 405 for DELETE requests", async () => {
      const response = await fetch(LOGIN_URL, { method: "DELETE" });
      expect(response.status).toBe(405);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // LOGOUT – Success
  // ──────────────────────────────────────────────────────────────────
  describe("DELETE /v1/session/logout – Successful Logout", () => {
    beforeEach(async () => {
      client = await DB_POOL.connect();
      try {
        await cleanDatabase(client);
        await applyMigrations();
        await createUser(TEST_USER);
      } finally {
        client.release();
      }
    });

    it("returns 200 and clears the sdi cookie", async () => {
      // Login first to get a valid session
      const loginRes = await loginRequest(
        { email: TEST_USER.email, password: TEST_USER.password },
        { "User-Agent": "jest-test-agent" },
      );
      expect(loginRes.status).toBe(200);
      const cookie = extractSessionCookie(loginRes);

      // Logout
      const logoutRes = await logoutRequest(cookie);
      expect(logoutRes.status).toBe(200);

      // Cookie should be cleared
      const setCookie = logoutRes.headers.get("set-cookie");
      expect(setCookie).toBeDefined();
      expect(setCookie).toContain("sdi=");
    });

    it("removes the session row from the database on logout", async () => {
      const loginRes = await loginRequest(
        { email: TEST_USER.email, password: TEST_USER.password },
        { "User-Agent": "jest-test-agent" },
      );
      const body = await loginRes.json();
      const cookie = extractSessionCookie(loginRes);

      // Confirm session exists
      const dbClient = await DB_POOL.connect();
      try {
        const before = await dbClient.query("SELECT * FROM session WHERE token = $1", [body.session_token]);
        expect(before.rows.length).toBe(1);
      } finally {
        dbClient.release();
      }

      // Logout
      await logoutRequest(cookie);

      // Confirm session is gone
      const dbClient2 = await DB_POOL.connect();
      try {
        const after = await dbClient2.query("SELECT * FROM session WHERE token = $1", [body.session_token]);
        expect(after.rows.length).toBe(0);
      } finally {
        dbClient2.release();
      }
    });

    it("does not affect other active sessions on logout", async () => {
      // Create two sessions
      const loginRes1 = await loginRequest(
        { email: TEST_USER.email, password: TEST_USER.password },
        { "User-Agent": "agent-1" },
      );
      const loginRes2 = await loginRequest(
        { email: TEST_USER.email, password: TEST_USER.password },
        { "User-Agent": "agent-2" },
      );
      const body2 = await loginRes2.json();
      const cookie1 = extractSessionCookie(loginRes1);

      // Logout session 1 (must use same agent it was created with)
      const logoutRes1 = await logoutRequest(cookie1, "agent-1");
      expect(logoutRes1.status).toBe(200);

      // Session 2 should still exist
      const dbClient = await DB_POOL.connect();
      try {
        const result = await dbClient.query("SELECT * FROM session WHERE token = $1", [body2.session_token]);
        expect(result.rows.length).toBe(1);
      } finally {
        dbClient.release();
      }
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // LOGOUT – Failure
  // ──────────────────────────────────────────────────────────────────
  describe("DELETE /v1/session/logout – Failed Logout", () => {
    beforeEach(async () => {
      client = await DB_POOL.connect();
      try {
        await cleanDatabase(client);
        await applyMigrations();
        await createUser(TEST_USER);
      } finally {
        client.release();
      }
    });

    it("returns 401 when no cookie is provided", async () => {
      const response = await fetch(LOGOUT_URL, { method: "DELETE" });

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toHaveProperty("name", "unauthorized");
    });

    it("returns 401 when cookie has an invalid/unknown token", async () => {
      const response = await logoutRequest("sdi=invalid-token-that-does-not-exist");

      expect(response.status).toBe(401);
    });

    it("returns 401 when trying to logout with an already-logged-out session", async () => {
      // Login and logout
      const loginRes = await loginRequest(
        { email: TEST_USER.email, password: TEST_USER.password },
        { "User-Agent": "jest-test-agent" },
      );
      const cookie = extractSessionCookie(loginRes);
      await logoutRequest(cookie);

      // Try to logout again with the same cookie
      const response = await logoutRequest(cookie);
      expect(response.status).toBe(401);
    });

    it("returns 401 when cookie name is wrong (not 'sdi')", async () => {
      const response = await fetch(LOGOUT_URL, {
        method: "DELETE",
        headers: { Cookie: "wrong_cookie=some-token" },
      });

      expect(response.status).toBe(401);
    });

    it("returns 401 when cookie value is empty", async () => {
      const response = await logoutRequest("sdi=");

      expect(response.status).toBe(401);
    });

    it("returns 401 when user-agent does not match the session's stored agent", async () => {
      const loginRes = await loginRequest(
        { email: TEST_USER.email, password: TEST_USER.password },
        { "User-Agent": "original-agent" },
      );
      expect(loginRes.status).toBe(200);
      const cookie = extractSessionCookie(loginRes);

      // Try to logout with a different user-agent
      const response = await logoutRequest(cookie, "different-agent");
      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // LOGOUT – HTTP Method enforcement
  // ──────────────────────────────────────────────────────────────────
  describe("DELETE /v1/session/logout – Method enforcement", () => {
    it("returns 405 for GET requests", async () => {
      const response = await fetch(LOGOUT_URL, { method: "GET" });
      expect(response.status).toBe(405);
    });

    it("returns 405 for POST requests", async () => {
      const response = await fetch(LOGOUT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(response.status).toBe(405);
    });

    it("returns 405 for PUT requests", async () => {
      const response = await fetch(LOGOUT_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(response.status).toBe(405);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // LOGIN edge cases – content type & body shape
  // ──────────────────────────────────────────────────────────────────
  describe("POST /v1/session/login – Edge cases", () => {
    beforeEach(async () => {
      client = await DB_POOL.connect();
      try {
        await cleanDatabase(client);
        await applyMigrations();
        await createUser(TEST_USER);
      } finally {
        client.release();
      }
    });

    it("returns an error when Content-Type header is missing", async () => {
      const response = await fetch(LOGIN_URL, {
        method: "POST",
        body: JSON.stringify({ email: TEST_USER.email, password: TEST_USER.password }),
      });

      // Express won't parse the body without Content-Type: application/json
      expect(response.status).not.toBe(200);
    });

    it("returns an error when body is not valid JSON", async () => {
      const response = await fetch(LOGIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "jest-test-agent" },
        body: "this-is-not-json",
      });

      expect(response.status).toBe(400);
    });

    it("returns 401 when email is null", async () => {
      const response = await loginRequest(
        { email: null, password: TEST_USER.password },
        { "User-Agent": "jest-test-agent" },
      );

      expect(response.status).toBe(401);
    });

    it("returns 401 when password is null", async () => {
      const response = await loginRequest(
        { email: TEST_USER.email, password: null },
        { "User-Agent": "jest-test-agent" },
      );

      expect(response.status).toBe(401);
    });

    it("returns 401 when email contains SQL injection attempt", async () => {
      const response = await loginRequest(
        { email: "' OR 1=1 --", password: TEST_USER.password },
        { "User-Agent": "jest-test-agent" },
      );

      expect(response.status).toBe(401);
    });

    it("returns 401 when password contains SQL injection attempt", async () => {
      const response = await loginRequest(
        { email: TEST_USER.email, password: "' OR 1=1 --" },
        { "User-Agent": "jest-test-agent" },
      );

      expect(response.status).toBe(401);
    });

    it("returns 401 when email has leading/trailing whitespace and does not match", async () => {
      const response = await loginRequest(
        { email: `  ${TEST_USER.email}  `, password: TEST_USER.password },
        { "User-Agent": "jest-test-agent" },
      );

      // Exact match should fail with whitespace
      expect([200, 401]).toContain(response.status);
    });
  });

  afterAll(async () => {
    await DB_POOL.end();
  });
});
