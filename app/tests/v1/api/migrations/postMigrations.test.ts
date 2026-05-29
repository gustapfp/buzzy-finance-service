import { DB_POOL } from "infra/database";
import { cleanDatabase } from "./utils";

const POST_MIGRATIONS_URL = `${process.env.BASE_URL}/api/v1/migrations`;

describe("POST Migrations", () => {
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
      const response = await fetch(POST_MIGRATIONS_URL, {
        method: "POST",
      });
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("applied_migrations");
    });
  });
});

afterAll(async () => {
  await DB_POOL.end();
});
