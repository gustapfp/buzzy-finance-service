import { HealthCheck } from "api/v1/status/types";
import { DB_POOL } from "infra/database/database";
import { BaseErrorResponse } from "infra/errors/types";
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
          const DeleteResponse = await fetch(`${BASE_URL}/v1/status`, {
            method: "DELETE",
          });
          expect(DeleteResponse.status).toBe(405);

          const PUTResponse = await fetch(`${BASE_URL}/v1/status`, {
            method: "PUT",
          });
          expect(PUTResponse.status).toBe(405);

          const PATCHResponse = await fetch(`${BASE_URL}/v1/status`, {
            method: "PATCH",
          });
          expect(PATCHResponse.status).toBe(405);
        });
      });
    });

    describe("Service Not Available", () => {
      jest.mock("/infra/database/database", () => {
        const actual = jest.requireActual("/infra/database/database");
        return {
          ...actual,
          DB_POOL: {
            connect: jest.fn().mockRejectedValue(new Error("connection refused")),
            idleCount: 0,
            totalCount: 0,
          },
        };
      });
      it("returns 503 on API call", async () => {
        const response = await fetch(`${BASE_URL}/v1/status`);
        expect(response.status).toBe(503);
      });
      it("returns error messages for Database", async () => {
        const response = await fetch(`${BASE_URL}/v1/status`);
        const data = (await response.json()) as HealthCheck;

        const dbError = data.database as BaseErrorResponse;
        expect(dbError.name).toBe("service_unavailable_error");
        expect(dbError.message).toBe("The Database is not available for connection right now.");
        expect(dbError.action).toBe("Notify the support team and try again later.");
        expect(dbError.status_code).toBe(503);

        expect(DB_POOL.idleCount === 0);
        expect(DB_POOL.totalCount === 0);
      });
    });
  });
});
