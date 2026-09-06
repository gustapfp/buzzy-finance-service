export const CREATE_USER_STATEMENT = `
INSERT INTO
  users (username, email, password, permission)
VALUES
  ($1, $2, $3, $4)
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
  updated_at = timezone('utc', now())
WHERE
  username = $1
RETURNING *;
`;

export const ADD_USER_PERMISSION_STATEMENT = `
UPDATE users
SET
  permission = array_append(permission, $2),
  updated_at = timezone('utc', now())
WHERE
  username = $1
  AND NOT ($2 = ANY(permission))
RETURNING *;
`;

export const REMOVE_USER_PERMISSION_STATEMENT = `
UPDATE users
SET
  permission = array_remove(permission, $2),
  updated_at = timezone('utc', now())
WHERE
  username = $1
  AND $2 = ANY(permission)
RETURNING *;
`;

export const SET_USER_PERMISSIONS_STATEMENT = `
UPDATE users
SET
  permission = $2,
  updated_at = timezone('utc', now())
WHERE
  username = $1
RETURNING *;
`;
