import { HealthCheck } from "api/v1/status/types";
import retry from "async-retry";

export async function waitForServices() {
  await waitForExpressService();
  await waitForEmailServer();

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
    process.stdout.write("💭 Connecting to Email Service...\n");
    const emailHttpUrl = `http://${process.env.EMAIL_HTTP_HOST}:${process.env.EMAIL_HTTP_PORT}`;
    return retry(fetchEmailPage, {
      retries: 100,
      maxTimeout: 1000,
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
