import { DB_POOL } from "infra/database/database";
import { cleanDatabase } from "./utils";
import { waitForServices } from "infra/scripts/waitForServices";

const MIGRATIONS_URL = `${process.env.BASE_URL}/api/v1/migrations`;
beforeAll(async () => {
  await waitForServices();
});
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
  describe("Error Responses", () => {
    it("returns 405 when called with any other method", async () => {
      const deleteResponse = await fetch(MIGRATIONS_URL, {
        method: "DELETE",
      });
      expect(deleteResponse.status).toBe(405);

      const putResponse = await fetch(MIGRATIONS_URL, {
        method: "PUT",
      });
      expect(putResponse.status).toBe(405);

      const patchResponse = await fetch(MIGRATIONS_URL, {
        method: "PATCH",
      });
      expect(patchResponse.status).toBe(405);
    });
  });
});

afterAll(async () => {
  await DB_POOL.end();
});
