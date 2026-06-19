import { HealthCheck } from "api/v1/status/types";
import retry from "async-retry";

export async function waitForServices() {
  await waitForExpressService();

  async function waitForExpressService() {
    let gugaTest;
    process.stdout.write("💭 Connecting to Express Service...");
    return retry(fetchStatusEndpoint, {
      retries: 100,
      maxTimeout: 5000,
      onRetry(error, attempt) {
        process.stdout.write(`Attempt ${attempt} failed: ${error}`);
      },
    });
    async function fetchStatusEndpoint() {
      const response = await fetch(`${process.env.BASE_URL}/api/v1/status`);
      const data = (await response.json()) as HealthCheck;
      if (data.status_message !== "ok") throw new Error(`Express Service is not ready: ${data}`);
      process.stdout.write("🟢 Express Service is ready!");
      return data;
    }
  }
}
