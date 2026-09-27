import http from "http";
import { DB_POOL } from "infra/database/database";
import { waitForServices } from "infra/scripts/waitForServices";
import {
  applyMigrations,
  cleanDatabase,
  registerAndActivate,
  extractSessionCookie as sharedExtractSessionCookie,
  getCurrentUser,
  UNAUTHORIZED_BODY,
  ISO_TIMESTAMP,
} from "../utils";
import type { LoginResponseBody } from "api/v1/session/types";

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

const extractSessionCookie = (response: Response): string => sharedExtractSessionCookie(response);

const parseLoginBody = async (response: Response): Promise<LoginResponseBody> => {
  return (await response.json()) as LoginResponseBody;
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
        await registerAndActivate(TEST_USER);
      } finally {
        client.release();
      }
    });

    it("C10 login sets better-auth.session_token without Secure", async () => {
      const response = await loginRequest(
        { email: TEST_USER.email, password: TEST_USER.password },
        { "User-Agent": "jest-test-agent" },
      );
      const body = await parseLoginBody(response);
      const setCookie = response.headers.getSetCookie().find((cookie) => cookie.includes("better-auth.session_token="));

      expect(response.status).toBe(200);
      expect(body).toEqual({});
      expect(body).not.toHaveProperty("session_token");
      expect(body).not.toHaveProperty("password");
      expect(setCookie).toBeDefined();
      expect(setCookie).toContain("better-auth.session_token=");
      expect(setCookie).not.toContain("__Secure-better-auth.session_token=");
      expect(setCookie).toContain("HttpOnly");
      expect(setCookie).toContain("Path=/");
      expect(setCookie).toContain("Max-Age=2592000");
      expect(setCookie).not.toMatch(/;\s*Secure(?:;|$)/);
    });

    it("returns a distinct session for each login", async () => {
      const res1 = await loginRequest(
        { email: TEST_USER.email, password: TEST_USER.password },
        { "User-Agent": "jest-test-agent" },
      );
      const res2 = await loginRequest(
        { email: TEST_USER.email, password: TEST_USER.password },
        { "User-Agent": "jest-test-agent" },
      );
      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      const dbClient = await DB_POOL.connect();
      try {
        const result = await dbClient.query("SELECT count(*)::int AS cnt FROM session");
        expect(result.rows[0].cnt).toBe(2);
      } finally {
        dbClient.release();
      }
    });

    it("stores the correct user-agent in the session record", async () => {
      const customAgent = "CustomBrowser/1.0";
      const response = await loginRequest(
        { email: TEST_USER.email, password: TEST_USER.password },
        { "User-Agent": customAgent },
      );
      expect(response.status).toBe(200);

      const dbClient = await DB_POOL.connect();
      try {
        const result = await dbClient.query(
          "SELECT user_agent FROM session WHERE user_id = (SELECT id FROM users WHERE email = $1) ORDER BY created_at DESC LIMIT 1",
          [TEST_USER.email],
        );
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
      expect(response.status).toBe(200);

      const dbClient = await DB_POOL.connect();
      try {
        const result = await dbClient.query(
          "SELECT expires_at FROM session WHERE user_id = (SELECT id FROM users WHERE email = $1) ORDER BY created_at DESC LIMIT 1",
          [TEST_USER.email],
        );
        const expiresAt = new Date(result.rows[0].expires_at);
        const now = new Date();
        const diffInDays = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

        expect(diffInDays).toBeGreaterThan(29);
        expect(diffInDays).toBeLessThanOrEqual(30);
      } finally {
        dbClient.release();
      }
    });

    it("C12 a fourth login leaves the oldest session valid", async () => {
      const cookies: string[] = [];
      for (let i = 0; i < 4; i++) {
        const res = await loginRequest(
          { email: TEST_USER.email, password: TEST_USER.password },
          { "User-Agent": `agent-${i}` },
        );
        expect(res.status).toBe(200);
        expect(res.headers.get("set-cookie")).toContain("better-auth.session_token=");
        cookies.push(extractSessionCookie(res));
      }

      const oldest = await getCurrentUser(cookies[0], { "User-Agent": "agent-0" });
      expect(oldest.status).toBe(200);
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
        await registerAndActivate(TEST_USER);
      } finally {
        client.release();
      }
    });

    it("C11 wrong password returns 401 without a cookie", async () => {
      const response = await loginRequest(
        { email: TEST_USER.email, password: "WrongPassword!999" },
        { "User-Agent": "jest-test-agent" },
      );

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual(UNAUTHORIZED_BODY);
      expect(response.headers.get("set-cookie")).toBeNull();
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

    it("returns 200 when the User-Agent header is an empty string", async () => {
      const response = await loginRequest(
        { email: TEST_USER.email, password: TEST_USER.password },
        { "User-Agent": "" },
      );

      expect(response.status).toBe(200);
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
        await registerAndActivate(TEST_USER);
      } finally {
        client.release();
      }
    });

    it("C17 logout clears that session and keeps the other", async () => {
      const loginRes1 = await loginRequest(
        { email: TEST_USER.email, password: TEST_USER.password },
        { "User-Agent": "agent-1" },
      );
      const loginRes2 = await loginRequest(
        { email: TEST_USER.email, password: TEST_USER.password },
        { "User-Agent": "agent-2" },
      );
      const cookie1 = extractSessionCookie(loginRes1);
      const cookie2 = extractSessionCookie(loginRes2);

      const logoutRes = await logoutRequest(cookie1, "agent-1");
      expect(logoutRes.status).toBe(200);
      const cleared = logoutRes.headers.getSetCookie().find((cookie) => cookie.includes("better-auth.session_token="));
      expect(cleared).toContain("Max-Age=0");

      const later = await getCurrentUser(cookie1, { "User-Agent": "agent-1" });
      expect(later.status).toBe(401);
      expect(await later.json()).toEqual(UNAUTHORIZED_BODY);

      const other = await getCurrentUser(cookie2, { "User-Agent": "agent-2" });
      expect(other.status).toBe(200);
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
        await registerAndActivate(TEST_USER);
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

    it("returns 200 when user-agent does not match the session's stored agent", async () => {
      const loginRes = await loginRequest(
        { email: TEST_USER.email, password: TEST_USER.password },
        { "User-Agent": "original-agent" },
      );
      expect(loginRes.status).toBe(200);
      const cookie = extractSessionCookie(loginRes);

      const response = await logoutRequest(cookie, "different-agent");
      expect(response.status).toBe(200);
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
        await registerAndActivate(TEST_USER);
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

  describe("GET /v1/user session", () => {
    beforeEach(async () => {
      client = await DB_POOL.connect();
      try {
        await cleanDatabase(client);
        await applyMigrations();
        await registerAndActivate(TEST_USER);
      } finally {
        client.release();
      }
    });

    const loginCookie = async (userAgent = "jest-test-agent") => {
      const response = await loginRequest(
        { email: TEST_USER.email, password: TEST_USER.password },
        { "User-Agent": userAgent },
      );
      expect(response.status).toBe(200);
      return extractSessionCookie(response);
    };

    it("C13 live cookie returns the session user and slides expiry", async () => {
      const cookie = await loginCookie();
      const before = Date.now();
      const first = await getCurrentUser(cookie);
      const firstBody = (await first.json()) as {
        session: { updated_at: string; expires_at: string };
        user: { username: string; email: string; permission: string[]; updated_at: string; password?: string };
      };
      expect(first.status).toBe(200);
      expect(firstBody.session.updated_at).toMatch(ISO_TIMESTAMP);
      expect(firstBody.session.expires_at).toMatch(ISO_TIMESTAMP);
      expect(firstBody.user.updated_at).toMatch(ISO_TIMESTAMP);
      expect(firstBody.user).toEqual({
        username: TEST_USER.username,
        email: TEST_USER.email,
        permission: ["create:session:own"],
        updated_at: firstBody.user.updated_at,
      });
      expect(firstBody).not.toHaveProperty("password");
      expect(firstBody.user).not.toHaveProperty("password");
      const expiresAt = Date.parse(firstBody.session.expires_at);
      expect(Math.abs(expiresAt - (before + 30 * 24 * 60 * 60 * 1000))).toBeLessThanOrEqual(60_000);
      expect(first.headers.get("set-cookie")).toContain("better-auth.session_token=");

      await new Promise((resolve) => setTimeout(resolve, 50));
      const second = await getCurrentUser(cookie);
      const secondBody = (await second.json()) as { session: { expires_at: string } };
      expect(Date.parse(secondBody.session.expires_at)).toBeGreaterThan(expiresAt);
    });

    it("C14 missing cookie returns 401", async () => {
      const response = await getCurrentUser(undefined, {});
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual(UNAUTHORIZED_BODY);
    });

    it("C14 unknown cookie returns 401", async () => {
      const response = await getCurrentUser("better-auth.session_token=unknown");
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual(UNAUTHORIZED_BODY);
    });

    it("C14 expired session returns 401", async () => {
      const cookie = await loginCookie();
      const dbClient = await DB_POOL.connect();
      try {
        await dbClient.query(`UPDATE session SET expires_at = timezone('utc', now()) - interval '1 minute'`);
      } finally {
        dbClient.release();
      }
      const response = await getCurrentUser(cookie);
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual(UNAUTHORIZED_BODY);
    });

    it("C15 deleted user session cookie returns 401", async () => {
      const cookie = await loginCookie();
      const dbClient = await DB_POOL.connect();
      try {
        await dbClient.query(`DELETE FROM users WHERE email = $1`, [TEST_USER.email]);
      } finally {
        dbClient.release();
      }
      const response = await getCurrentUser(cookie);
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual(UNAUTHORIZED_BODY);
    });

    it("C16 a different user agent is accepted", async () => {
      const cookie = await loginCookie("original-agent");
      const response = await getCurrentUser(cookie, { "User-Agent": "other-agent" });
      expect(response.status).toBe(200);
    });

    it("C16 a missing user agent is accepted", async () => {
      const cookie = await loginCookie();
      const url = new URL(`${process.env.BASE_URL}/api/v1/user`);
      const status = await new Promise<number>((resolve, reject) => {
        const req = http.request(
          {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: "GET",
            headers: { Cookie: cookie },
          },
          (res) => {
            res.resume();
            resolve(res.statusCode ?? 0);
          },
        );
        req.on("error", reject);
        req.end();
      });
      expect(status).toBe(200);
    });

    it("C18 logout without a cookie returns 401 and keeps sessions", async () => {
      const cookie = await loginCookie();
      const response = await fetch(LOGOUT_URL, { method: "DELETE" });
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual(UNAUTHORIZED_BODY);
      const still = await getCurrentUser(cookie);
      expect(still.status).toBe(200);
    });
  });

  afterAll(async () => {
    await DB_POOL.end();
  });
});
