import { query } from "infra/database/database";
import { newUserIsValid } from "./helpers";
import { logger } from "api/utils/logger";

const CREATE_USER_STATEMENT = `
INSERT INTO
  users (username, email, password)
VALUES
  ($1, $2, $3)
RETURNING *;
`;

const createUser = async (username: string, email: string, password: string) => {
  try {
    if (await newUserIsValid(email, username)) {
      const result = await query(CREATE_USER_STATEMENT, [username, email, password]);
      logger.info(result);
      return result.rows[0];
    }
  } catch (err) {
    console.log(err);
    throw err;
  }
};

const getUser = async () => {};

export const userModel = { createUser, getUser };

export default userModel;
