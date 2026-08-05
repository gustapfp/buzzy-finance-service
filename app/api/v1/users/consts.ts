export const CREATE_USER_STATEMENT = `
INSERT INTO
  users (username, email, password)
VALUES
  ($1, $2, $3)
RETURNING *;
`;

export const GET_USER_BY_USERNAME_STATEMENT = `
SELECT *
FROM users
WHERE
  LOWER(username) = LOWER($1)
LIMIT
  1;
`;

export const GET_USER_BY_ID_STATEMENT = `
SELECT *
FROM users
WHERE
  id = $1
LIMIT
  1;
`;

export const GET_USER_BY_EMAIL_STATEMENT = `
SELECT *
FROM users
WHERE
  LOWER(email) = LOWER($1)
LIMIT
  1;
`;

export const UPDATE_USER_STATEMENT = `
UPDATE users
SET
  username = $2,
  email = $3,
  password = $4,
  updated_at = timezone('utc', now()),
  permission = $5
WHERE
  username = $1
RETURNING *;
`;
