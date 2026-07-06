import { HealthCheck } from "api/v1/status/types";
import { DB_POOL } from "infra/database/database";
import { waitForServices } from "infra/scripts/waitForServices";
import { DatabaseStatusResponse } from "infra/types";
import { describe } from "node:test";
const BASE_URL = `${process.env.BASE_URL}/api`;
beforeAll(async () => {
  await waitForServices();
});
describe("GET Status", () => {
  describe("GET api/v1/status", () => {
    describe("Successful Response", () => {
      it("returns 200 on API call", async () => {
        const response = await fetch(`${BASE_URL}/v1/status`);
        expect(response.status).toBe(200);
      });
      it("returns success messages for Database and Application", async () => {
        const response = await fetch(`${BASE_URL}/v1/status`);
        const data = (await response.json()) as HealthCheck;
        const db = data.database as DatabaseStatusResponse;
        expect(db.postgres_version).toContain("V16");
        expect(data.api.server_message).toBe("I'm good and running!:)");
        expect(db.db_message).toBe("Database connection ok...");
        expect(db.active_connections).toEqual(1);
        expect(db.max_connections).toEqual(expect.any(Number));

        expect(db.update_at).toBeTruthy();
        expect(new Date(db.update_at).toISOString()).toBe(db.update_at);
        expect(DB_POOL.idleCount === 0);
        expect(DB_POOL.totalCount === 0);
      });
    });

    describe("Error Response", () => {
      describe("Not found and not allowed methods", () => {
        it("returns 404 when called wrong API version and URL", async () => {
          let response = await fetch(`${BASE_URL}/status`);
          expect(response.status).toBe(404);
          response = await fetch(`${BASE_URL}/v0/status`);
          expect(response.status).toBe(404);
        });

        it("returns 405 when called with Delete", async () => {
          const deleteResponse = await fetch(`${BASE_URL}/v1/status`, {
            method: "DELETE",
          });
          expect(deleteResponse.status).toBe(405);

          const putResponse = await fetch(`${BASE_URL}/v1/status`, {
            method: "PUT",
          });
          expect(putResponse.status).toBe(405);

          const patchResponse = await fetch(`${BASE_URL}/v1/status`, {
            method: "PATCH",
          });
          expect(patchResponse.status).toBe(405);
        });
      });
    });
  });
});
