import { DB_POOL } from "infra/database/database";
import { waitForServices } from "infra/scripts/waitForServices";

const ENDPOINT_URL = `${process.env.BASE_URL}/api/v1/users`;

const createUser = async (body: any) => {
  return await fetch(ENDPOINT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
};

describe("POST /v1/users", () => {
  let client: any;

  beforeAll(async () => {
    await waitForServices();
  });
  describe("Successful response", () => {
    beforeEach(async () => {
      client = await DB_POOL.connect();
      try {
        await client.query("TRUNCATE TABLE users CASCADE;");
      } finally {
        client.release();
      }
    });

    it("Creates a new user and return a 201 response", async () => {
      const user1 = {
        username: "user1",
        email: "user1@gmail.com",
        password: "user1234",
      };

      const userResponse = await createUser(user1);
      const userResponseBody = await userResponse.json();
      expect(userResponse.status).toBe(201);
      expect(userResponseBody).toEqual({
        username: user1.username,
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });
      expect(userResponseBody).not.toHaveProperty("password");
      expect(userResponseBody).not.toHaveProperty("id");
      expect(userResponseBody).not.toHaveProperty("email");
    });
    it("Throws an error when the username already exists", async () => {
      const user1 = {
        username: "user1",
        email: "user1@gmail.com",
        password: "user1234",
      };
      const User1 = {
        username: "User1",
        email: "User1@gmail.com",
        password: "user1234",
      };
      const user1Response = await createUser(user1);
      expect(user1Response.status).toBe(201);
      const User1Response = await createUser(User1);
      expect(User1Response.status).toBe(422);
    });
  });
  afterAll(async () => {
    await DB_POOL.end();
  });
});
