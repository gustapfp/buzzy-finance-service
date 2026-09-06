export const SALT_ROUNDS: number = process.env.NODE_ENV == "local" ? 1 : Number(process.env.SALT_ROUNDS);
export const APP_SECRET = process.env.APP_SECRET;

export const ACTIVATION_TOKEN_EXPIRES_AT = 60 * 15 * 1000; // 15 minutes in milliseconds
export const CREATE_ACTIVATION_TOKEN_STATEMENT = `
INSERT INTO
  user_activation_tokens (user_id, expires_at)
VALUES
  ($1, $2)
RETURNING *;
`;

export const VALIDATE_ACTIVATION_TOKEN_STATEMENT = `
UPDATE user_activation_tokens
SET
  used_at = timezone('utc', now()),
  updated_at = timezone('utc', now())
WHERE
  token = $1
  AND used_at IS NULL
  AND expires_at > timezone('utc', now())
RETURNING *;
`;
