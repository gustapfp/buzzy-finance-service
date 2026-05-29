import { DB_POOL } from "../../../../infra/database";
import { cleanDatabase } from "./utils";

const GET_MIGRATIONS_URL = `${process.env.BASE_URL}/api/v1/migrations`;

describe("GET Migrations", () => {
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
      const response = await fetch(GET_MIGRATIONS_URL);
      expect(response.status).toBe(200);
      const data = (await response.json()) as any;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(0);
    });
  });
});

afterAll(async () => {
  await DB_POOL.end();
});
