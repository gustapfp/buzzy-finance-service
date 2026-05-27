import { HealthCheckResponse } from "api/v1/status/types";
import { DB_POOL } from "infra/database";
import { logger } from "utils/logger";

const BASE_URL = `${process.env.BASE_URL}/api`;

describe("API -> Health Check", () => {
  describe("GET /v1/", () => {
    it("returns 200 on API call", async () => {
      const response = await fetch(`${BASE_URL}/v1/status`);
      expect(response.status).toBe(200);
    });
    it("returns success messages for Database and Application", async () => {
      const response = await fetch(`${BASE_URL}/v1/status`);
      const data = (await response.json()) as HealthCheckResponse;
      logger.info(data);
      expect(data.database.postgres_version).toBe("V16.0");
      expect(data.api.server_message).toBe("I'm good and running!:)");
      expect(data.database.db_message).toBe("Database connection ok...");
      expect(data.database.active_connections).toEqual(1);
      expect(data.database.max_connections).toEqual(expect.any(Number));
      expect(data.database.max_connections).toBeLessThanOrEqual(100);
      expect(data.database.update_at).toBeTruthy();
      expect(new Date(data.database.update_at).toISOString()).toBe(data.database.update_at);
      expect(DB_POOL.idleCount === 0);
      expect(DB_POOL.totalCount === 0);
    });

    it("returns 404 when called wrong API version and URL", async () => {
      let response = await fetch(`${BASE_URL}/status`);
      expect(response.status).toBe(404);
      response = await fetch(`${BASE_URL}/v0/status`);
      expect(response.status).toBe(404);
    });
  });
});
