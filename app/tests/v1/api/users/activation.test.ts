import { createHmac } from "crypto";
import { DB, DB_POOL } from "infra/database/database";
import { waitForServices } from "infra/scripts/waitForServices";
import {
  activateUser,
  activationTokenFromEmail,
  applyMigrations,
  cleanDatabase,
  createUser,
  deleteAllEmails,
  extractSessionCookie,
  getLastEmail,
  listEmails,
  loginUser,
  resendActivation,
} from "../utils";
import { PERMISSIONS } from "infra/auth/authorization";

const USERS_ENDPOINT_URL = `${process.env.BASE_URL}/api/v1/user`;
const ACTIVATION_NOT_FOUND = {
  name: "not_found_error",
  message: "Activation token not found or expired",
  action: "Please request a new activation token.",
  status_code: 404,
};
const RESEND_BODY = {
  message: "If an unactivated account exists for that email, a new link was sent.",
};

const seedUser = {
  username: "user1",
  email: "User1@gmail.com",
  password: "user1234",
};

const signExpiredToken = (email: string, secret: string) => {
  const header = Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ email, iat: now - 20, exp: now - 10 })).toString("base64url");
  const data = `${header}.${payload}`;
  const signature = createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${signature}`;
};

describe("User activation", () => {
  let client: any;

  beforeAll(async () => {
    await waitForServices();
  });

  const permissionFor = async (username: string) => {
    const result = await DB.query(`SELECT permission FROM users WHERE LOWER(username) = LOWER($1)`, [username]);
    return result.rows[0].permission;
  };

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

    it("C5 live activation token sets create:session:own", async () => {
      await createUser(seedUser);
      const email = await getLastEmail();
      const token = activationTokenFromEmail(email.text);
      const response = await activateUser(token);
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body).toEqual({ message: "User activated successfully" });
      expect(response.headers.get("set-cookie")).toBeNull();
      expect(await permissionFor(seedUser.username)).toEqual([PERMISSIONS.CREATE_OWN_SESSION]);
    });

    it("C6 activation token for an activated account returns 200 and leaves permission", async () => {
      await createUser(seedUser);
      const email = await getLastEmail();
      const token = activationTokenFromEmail(email.text);
      await activateUser(token);
      const before = await permissionFor(seedUser.username);
      const response = await activateUser(token);
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body).toEqual({ message: "User activated successfully" });
      expect(await permissionFor(seedUser.username)).toEqual(before);
    });

    it("C7 expired activation token returns 404", async () => {
      await createUser(seedUser);
      const before = await permissionFor(seedUser.username);
      const token = signExpiredToken(seedUser.email.toLowerCase(), process.env.BETTER_AUTH_SECRET ?? "");
      const response = await activateUser(token);
      const body = await response.json();
      expect(response.status).toBe(404);
      expect(body).toEqual(ACTIVATION_NOT_FOUND);
      expect(await permissionFor(seedUser.username)).toEqual(before);
    });

    it("C7 non-jwt activation token returns 404", async () => {
      await createUser(seedUser);
      const before = await permissionFor(seedUser.username);
      const response = await activateUser("not-a-verification-jwt");
      const body = await response.json();
      expect(response.status).toBe(404);
      expect(body).toEqual(ACTIVATION_NOT_FOUND);
      expect(await permissionFor(seedUser.username)).toEqual(before);
    });

    it("C7 missing activation token returns 404", async () => {
      await createUser(seedUser);
      const before = await permissionFor(seedUser.username);
      const response = await fetch(`${USERS_ENDPOINT_URL}/activate`, { method: "PATCH" });
      const body = await response.json();
      expect(response.status).toBe(404);
      expect(body).toEqual(ACTIVATION_NOT_FOUND);
      expect(await permissionFor(seedUser.username)).toEqual(before);
    });

    it("C8 resend sends a new email and the previous token still activates", async () => {
      await createUser(seedUser);
      const first = await getLastEmail();
      const previousToken = activationTokenFromEmail(first.text);
      const response = await resendActivation(seedUser.email);
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body).toEqual(RESEND_BODY);
      const emails = await listEmails();
      expect(emails.length).toBeGreaterThanOrEqual(2);
      const emailUrl = `http://${process.env.EMAIL_HTTP_HOST}:${process.env.EMAIL_HTTP_PORT}`;
      for (const item of emails) {
        const text = await (await fetch(`${emailUrl}/messages/${item.id}.plain`)).text();
        const token = activationTokenFromEmail(text);
        const link = `${process.env.WEBAPP_URL}/register/activate?token=${encodeURIComponent(token)}`;
        expect(item.subject).toBe("Ative a sua conta na Buzzy Finance");
        expect(text.replace(/\r\n/g, "\n").trimEnd()).toBe(
          `Olá ${seedUser.username},\n\nPor favor, ative a sua conta clicando no seguinte link:\n\n${link}\n\n Nos vemos logo. Muito Obrigado!`,
        );
        const payloadPart = token.split(".")[1] ?? "";
        const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8")) as {
          email?: string;
          username?: string;
          iat: number;
          exp: number;
        };
        expect(payload.email).toBe(seedUser.email.toLowerCase());
        expect(payload).not.toHaveProperty("username");
        expect(Math.abs(payload.exp - (payload.iat + 900))).toBeLessThanOrEqual(2);
      }
      const activated = await activateUser(previousToken);
      expect(activated.status).toBe(200);
      expect(await activated.json()).toEqual({ message: "User activated successfully" });
      expect(activated.headers.get("set-cookie")).toBeNull();
      expect(await permissionFor(seedUser.username)).toEqual([PERMISSIONS.CREATE_OWN_SESSION]);
    });

    it("C8 resend with another account session still sends for an unactivated email", async () => {
      const other = { username: "user2", email: "user2@gmail.com", password: "user1234" };
      await createUser(other);
      const otherEmail = await getLastEmail();
      await activateUser(activationTokenFromEmail(otherEmail.text));
      const login = await loginUser({ email: other.email, password: other.password });
      const cookie = extractSessionCookie(login);
      await deleteAllEmails();
      await createUser(seedUser);
      await deleteAllEmails();
      const response = await resendActivation(seedUser.email, cookie);
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body).toEqual(RESEND_BODY);
      expect(await listEmails()).toHaveLength(1);
      expect(await permissionFor(seedUser.username)).toEqual([]);
    });

    it("C9 resend for an unknown email sends nothing", async () => {
      await deleteAllEmails();
      const response = await resendActivation("missing@gmail.com");
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body).toEqual(RESEND_BODY);
      expect(await listEmails()).toHaveLength(0);
    });

    it("C9 resend for an activated account sends nothing", async () => {
      await createUser(seedUser);
      const email = await getLastEmail();
      await activateUser(activationTokenFromEmail(email.text));
      const before = await permissionFor(seedUser.username);
      await deleteAllEmails();
      const response = await resendActivation(seedUser.email);
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body).toEqual(RESEND_BODY);
      expect(await listEmails()).toHaveLength(0);
      expect(await permissionFor(seedUser.username)).toEqual(before);
    });

    it("C9 resend with a session cookie for an activated account sends nothing", async () => {
      await createUser(seedUser);
      const email = await getLastEmail();
      await activateUser(activationTokenFromEmail(email.text));
      const before = await permissionFor(seedUser.username);
      const login = await loginUser({ email: seedUser.email, password: seedUser.password });
      const cookie = extractSessionCookie(login);
      await deleteAllEmails();
      const response = await resendActivation(seedUser.email, cookie);
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body).toEqual(RESEND_BODY);
      expect(await listEmails()).toHaveLength(0);
      expect(await permissionFor(seedUser.username)).toEqual(before);
    });
  });

  describe("Method enforcement", () => {
    it("GET is rejected via catchNotAllowedMethods", async () => {
      const response = await fetch(`${USERS_ENDPOINT_URL}/activate`, { method: "GET" });
      expect(response.status).toBe(405);
    });
  });

  afterAll(async () => {
    await DB_POOL.end();
  });
});
