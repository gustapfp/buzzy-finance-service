// import type { HealthCheckResponse } from "app/api/v1/health/types";
// import { DB_POOL } from "infra/database";

// const BASE_URL = `${process.env.BASE_URL}/api/`;

// describe("API -> Health Check", () => {
//   describe("GET /v1/health", () => {
//     it("returns 200 on API call", async () => {
//       const response = await fetch(`${BASE_URL}/v1/health`);
//       expect(response.status).toBe(200);
//     });
//     it("returns success messages for Database and Application", async () => {
//       const response = await fetch(`${BASE_URL}/v1/health`);
//       const data = (await response.json()) as HealthCheckResponse;

//       expect(data.database.postgres_version).toBe("V16.0");
//       expect(data.webapp.server_message).toBe("Application running...");
//       expect(data.database.db_message).toBe("Database connection ok...");
//       expect(data.database.active_connections).toEqual(1);
//       expect(data.database.max_connections).toEqual(expect.any(Number));
//       expect(data.database.max_connections).toBeLessThanOrEqual(100);
//       expect(data.database.update_at).toBeTruthy();
//       expect(new Date(data.database.update_at).toISOString()).toBe(data.database.update_at);
//       expect(DB_POOL.idleCount === 0);
//       expect(DB_POOL.totalCount === 0);
//     });

//     it("returns 404 when called wrong API version and URL", async () => {
//       let response = await fetch(`${BASE_URL}/health`);
//       expect(response.status).toBe(404);
//       response = await fetch(`${BASE_URL}/v0/health`);
//       expect(response.status).toBe(404);
//     });
//   });
// });
