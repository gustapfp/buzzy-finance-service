import { HealthCheck } from "api/v1/status/types";
import retry from "async-retry";
import { existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const readyMarker = join(tmpdir(), `buzzy-finance-services-${process.pid}`);

export async function waitForServices() {
  if (existsSync(readyMarker)) return;

  await waitForExpressService();
  await waitForEmailServer();
  writeFileSync(readyMarker, "");

  async function waitForExpressService() {
    process.stdout.write("💭 Connecting to Express Service...\n");
    return retry(fetchStatusEndpoint, {
      retries: 100,
      maxTimeout: 5000,
      onRetry(error, attempt) {
        process.stdout.write(`Attempt ${attempt} failed: ${error}\n`);
      },
    });
    async function fetchStatusEndpoint() {
      const response = await fetch(`${process.env.BASE_URL}/api/v1/status`);
      const data = (await response.json()) as HealthCheck;
      if (data.status_message !== "ok") throw new Error(`Express Service is not ready: ${data}`);
      process.stdout.write("🟢 Express Service is ready!\n");
      return data;
    }
  }

  async function waitForEmailServer() {
    const host = process.env.EMAIL_HTTP_HOST;
    const port = process.env.EMAIL_HTTP_PORT;
    if (!host || !port) {
      throw new Error("EMAIL_HTTP_HOST and EMAIL_HTTP_PORT must be set");
    }
    process.stdout.write("💭 Connecting to Email Service...\n");
    const emailHttpUrl = `http://${host}:${port}`;
    return retry(fetchEmailPage, {
      retries: 100,
      maxTimeout: 1000,
      onRetry(error, attempt) {
        process.stdout.write(`Attempt ${attempt} failed: ${error}\n`);
      },
    });
    async function fetchEmailPage() {
      const response = await fetch(emailHttpUrl);
      if (response.status !== 200) {
        throw new Error("Email Service is not ready");
      }
      process.stdout.write("🟢 Email Service is ready!\n");
    }
  }
}
