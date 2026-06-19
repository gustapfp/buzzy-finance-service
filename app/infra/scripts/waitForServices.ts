import retry from "async-retry";

export async function waitForServices() {
  await waitForExpressService();

  async function waitForExpressService() {
    console.log("💭 Connecting to Express Service...");
    return retry(fetchStatusEndpoint, {
      retries: 100,
      maxTimeout: 5000,
    });
    async function fetchStatusEndpoint() {
      const response = await fetch(`${process.env.BASE_URL}/api/v1/status`);
      const data = await response.json();
      return data;
    }
  }
}
