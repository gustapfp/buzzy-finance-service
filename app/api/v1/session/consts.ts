export const CREATE_SESSION_STATEMENT = `
INSERT INTO
  session (token, user_agent, user_id, expires_at)
VALUES
  ($1, $2, $3, $4)
RETURNING *;
`;

export const FIND_ONE_VALID_SESSION_BY_TOKEN_STATEMENT = `
SELECT
  *
FROM
  session
WHERE
  token = $1
  AND expires_at > NOW()
  AND user_agent = $2
LIMIT 1;
`;

export const DELETE_SESSION_STATEMENT = `
DELETE FROM
  session
WHERE
  token = $1
RETURNING *;
`;

export const MAX_SESSIONS_PER_USER = 3;

export const EVICT_OLDEST_SESSIONS_STATEMENT = `
DELETE FROM
  session
WHERE
  user_id = $1
  AND expires_at > NOW()
  AND id NOT IN (
    SELECT id
    FROM session
    WHERE user_id = $1
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT $2 - 1
  );
`;
