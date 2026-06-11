import { DB_POOL } from "infra/database";
import { cleanDatabase } from "./utils";

const MIGRATIONS_URL = `${process.env.BASE_URL}/api/v1/migrations`;

describe("/migrations Endpoint", () => {
  describe("GET api/v1/migrations", () => {
    let client: any;

    beforeEach(async () => {
      client = await DB_POOL.connect();
      try {
        await cleanDatabase(client);
      } finally {
        client.release();
      }
    });

    it("Returns 200 and correct number of migrations", async () => {
      const response = await fetch(MIGRATIONS_URL);
      expect(response.status).toBe(200);
      const data = (await response.json()) as any;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(0);
    });
  });
  describe("POST /api/v1/migrations", () => {
    let client: any;

    beforeEach(async () => {
      client = await DB_POOL.connect();
      try {
        await cleanDatabase(client);
      } finally {
        client.release();
      }
    });

    it("Returns 201 and the right body", async () => {
      const response = await fetch(MIGRATIONS_URL, {
        method: "POST",
      });
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("applied_migrations");
    });
  });
  describe("Expect 405 Not Allowed", () => {
    it("Returns 405 when called with Delete", async () => {
      const response = await fetch(MIGRATIONS_URL, {
        method: "DELETE",
      });
      expect(response.status).toBe(405);
    });
    it("Returns 405 when called with Put", async () => {
      const response = await fetch(MIGRATIONS_URL, {
        method: "PUT",
      });
      expect(response.status).toBe(405);
    });
    it("Returns 405 when called with Patch", async () => {
      const response = await fetch(MIGRATIONS_URL, {
        method: "PATCH",
      });
      expect(response.status).toBe(405);
    });
  });
});

afterAll(async () => {
  await DB_POOL.end();
});
