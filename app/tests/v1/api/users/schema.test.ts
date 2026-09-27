import { execFile } from "child_process";
import { promisify } from "util";
import { DB_POOL } from "infra/database/database";
import { waitForServices } from "infra/scripts/waitForServices";
import { applyMigrations, cleanDatabase, createUser, loginUser, UNAUTHORIZED_BODY } from "../utils";

const execFileAsync = promisify(execFile);

describe("users schema", () => {
  beforeAll(async () => {
    await waitForServices();
  });

  it("C22 migration drops password and activation tokens and old passwords cannot log in", async () => {
    const client = await DB_POOL.connect();
    try {
      await cleanDatabase(client);
    } finally {
      client.release();
    }

    await execFileAsync(
      "pnpm",
      ["exec", "node-pg-migrate", "-j", "ts", "-m", "./app/infra/migrations", "--envPath", ".env.test", "up", "4"],
      {
        cwd: process.cwd(),
        env: { ...process.env, NODE_OPTIONS: "--import tsx" },
      },
    );

    const insertClient = await DB_POOL.connect();
    try {
      await insertClient.query(`INSERT INTO users (username, email, password, permission) VALUES ($1, $2, $3, $4)`, [
        "olduser",
        "old@test.com",
        "old-password-value",
        ["create:session:own"],
      ]);
    } finally {
      insertClient.release();
    }

    await applyMigrations();

    const columns = await DB_POOL.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'users'`,
    );
    const names = columns.rows.map((row: { column_name: string }) => row.column_name);
    expect(names).toEqual(expect.arrayContaining(["username", "email", "permission"]));
    expect(names).not.toContain("password");

    const activationTable = await DB_POOL.query(`SELECT to_regclass('public.user_activation_tokens') AS name`);
    expect(activationTable.rows[0].name).toBeNull();

    const oldLogin = await loginUser({ email: "old@test.com", password: "old-password-value" });
    expect(oldLogin.status).toBe(401);
    expect(await oldLogin.json()).toEqual(UNAUTHORIZED_BODY);

    const password = "user1234";
    await createUser({ username: "newuser", email: "new@test.com", password });
    const stored = await DB_POOL.query(
      `SELECT account.password FROM account JOIN users ON users.id = account.user_id WHERE users.username = $1`,
      ["newuser"],
    );
    const verifier = stored.rows[0].password as string;
    expect(verifier).not.toBe(password);
    expect(verifier).not.toBe(`${password}.${process.env.APP_SECRET}`);
  });

  afterAll(async () => {
    await DB_POOL.end();
  });
});
