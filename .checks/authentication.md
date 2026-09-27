# Authentication

Profile: light. No `tlc-implement` declaration in `AGENTS.md`, so the floor is light. Light is thin for credential storage; this report stays on light unless you raise the profile.

Sources:

- `docs/Roadmap/M2/M1I27/authentication.task.md` - the 23 criteria, the decided doors, and what stays unresolved
- `docs/Roadmap/M2/M1I27/authentication.md` - **binding for the interface**: the routes and bodies in Surface, the email text in criterion 3, and key decisions 1–7 as amended 2026-09-26
- The user, 2026-09-26 - where the spike failed, use Better Auth's behavior
- The user, 2026-09-26 - login `200` body is `{}`
- [Better Auth database](https://www.better-auth.com/docs/concepts/database) - password is on `account`; the user table can be renamed
- [Better Auth cookies](https://www.better-auth.com/docs/concepts/cookies) - `better-auth.session_token`
- [Better Auth email and password](https://www.better-auth.com/docs/authentication/email-password) - `sendVerificationEmail` receives `token`
- `better-auth@1.7.6` `dist/api/routes/email-verification.mjs`, `dist/cookies/index.mjs`, `dist/api/routes/update-user.mjs`, `dist/api/routes/sign-in.mjs`, `dist/api/routes/sign-up.mjs` - JWT payload, cookie prefix, `revokeOtherSessions`, unverified `403`, duplicate-email synthetic success

## Out of scope

- Social login, passkeys, and two-factor - the user kept them out of this round
- New permission rules - the catalog stays `action:resource:modifier`
- A cap of three sessions - the user dropped it
- Deleting the current session in the same commit as a password change - the current session stays
- Mounting the library at its own path - the webapp already calls these routes
- A forgot-password mail - this round does not add one
- `SameSite` asserted on the login cookie - Unresolved 2; criterion 10 does not assert it
- Password length `422` as a numbered criterion - Unresolved 4; the interim body is implemented and is not a check
- `PUT` password with no cookie deleting sessions - Unresolved 3; the interim is a `200`, the password changes, and no session is deleted

## Landing

Handlers in `app/api/v1/users` and `app/api/v1/session` call `getAuth()` in `app/api/utils/auth.ts`. The `pg` pool in `app/infra/database/database.ts` is the library database. Signup duplicate checks stay `newUserIsValid`. Mail stays `mailManager`.

| One-way door                                             | Literal shape                                                                                                                                                                             | Alternative rejected                                                                                                                        |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Library                                                  | `better-auth` 1.7.6, `database: DB_POOL`, called from the existing handlers. Not mounted on its own path                                                                                  | The library's `/api/auth` router - the webapp already calls these paths                                                                     |
| Load the ESM package from this CommonJS emit             | `await import("better-auth")` inside `getAuth()`                                                                                                                                          | `"type": "module"` - the task forbids it; a static import compiles to `require()` and `node dist/app/api/server.js` cannot load the package |
| Verification token                                       | `emailVerification.expiresIn` 900. Signed JWT payload `email` lowercased. Not a row. `user_activation_tokens` dropped                                                                     | Keeping `user_activation_tokens` - this library does not store this token                                                                   |
| Credential storage                                       | `user.modelName` `users`. `user.fields.name` `username`. Password row in `account`. `session` dropped and recreated as the library table. `users.password` dropped in that migration      | A second `user` table - `username` and `permission` would leave `users`                                                                     |
| Cookie                                                   | Name `better-auth.session_token` when `NODE_ENV` is not `production` and `baseURL` is `http`. `session.expiresIn` 2592000. `session.updateAge` 0. `HttpOnly`, `Path=/`, `Max-Age=2592000` | Keeping the name `sdi` - choosing this library changes the cookie name. `updateAge` 86400 does not slide on every request                   |
| Columns the library writes that this API does not return | `users.email_verified` boolean not null default false, `users.image` text null, tables `account`, `session`, `verification`                                                               | Omitting `image` or `verification` - the library schema check rejects the first auth request when a written column or table is missing      |

- Nothing else in this change is hard to reverse

## Checks

### S1 - Auth library · `app/api/utils/auth.ts`, `app/api/server.ts`, `app/infra/database/database.ts` · 3.3 KB · ~1k

**C23** - After `pnpm build`, `node --env-file=.env.test dist/app/api/server.js` answers the signup in criterion 1 with `201`
Proof: `pnpm build` then `node --env-file=.env.test dist/app/api/server.js` and `POST /api/v1/user` `{ username, email, password }` returns `201`

### S2 - Signup · `app/api/v1/users/*`, `app/tests/v1/api/users/createUsers.test.ts`, `app/infra/email/mailManager.ts` · 20 KB · ~5k

**C1** - `POST /api/v1/user` with a new username and email returns `201` `{ username, created_at, updated_at }`, both timestamps match `YYYY-MM-DDTHH:mm:ss.sssZ`, the body has no `password`, `email`, `id`, or `permission`, the response has no `Set-Cookie`, stored `users.permission` is `[]`, and stored `users.email` is the submitted email lowercased
Proof: `pnpm exec jest --runInBand -t "C1 signup returns 201 without a cookie and stores an empty permission"`

**C2** - Login with that email and password returns `401` `{ name: "unauthorized", message: "User Unauthorized to do this operation.", action: "Please try to login again or if you're facing any issue contact the support team.", status_code: 401 }` and has no `Set-Cookie`
Proof: `pnpm exec jest --runInBand -t "C2 login before activation returns 401 without a cookie"`

**C3** - That signup sends one email with subject `Ative a sua conta na Buzzy Finance` and text `Olá <username>,\n\nPor favor, ative a sua conta clicando no seguinte link:\n\n<link>\n\n Nos vemos logo. Muito Obrigado!`, the link is `WEBAPP_URL/register/activate?token=<token>` with the token percent-encoded, the token payload's `email` is the signup email lowercased, the payload does not contain the username, and `exp` is within 2 seconds of `iat` + 900
Proof: `pnpm exec jest --runInBand -t "C3 signup sends the activation email"`

**C4** - A username or email already stored, compared case-insensitively, returns `422` `{ name: "validation_error", message: "These fields are not valid: <fields>", action: "Fix the provided fields and try again.", status_code: 422 }`, `<fields>` is `email`, `username`, or `email,username`, no new `users` row is stored, and no email is sent
Proof: `pnpm exec jest --runInBand -t "C4 duplicate email returns 422 and stores nothing"`
Proof: `pnpm exec jest --runInBand -t "C4 duplicate username returns 422 and stores nothing"`
Proof: `pnpm exec jest --runInBand -t "C4 duplicate email and username returns 422 and stores nothing"`

### S3 - Activation · `app/tests/v1/api/users/activation.test.ts` · 16 KB · ~4k

**C5** - `PATCH /api/v1/user/activate?token=` with an unexpired token for `permission` `[]` returns `200` `{ message: "User activated successfully" }`, has no `Set-Cookie`, and `users.permission` is `["create:session:own"]`
Proof: `pnpm exec jest --runInBand -t "C5 live activation token sets create:session:own"`

**C6** - The same call for `permission` `["create:session:own"]` returns `200` `{ message: "User activated successfully" }` and `permission` is unchanged
Proof: `pnpm exec jest --runInBand -t "C6 activation token for an activated account returns 200 and leaves permission"`

**C7** - A token whose `exp` is in the past, a token that is not a verification JWT, or a missing query param returns `404` `{ name: "not_found_error", message: "Activation token not found or expired", action: "Please request a new activation token.", status_code: 404 }` and `permission` is unchanged
Proof: `pnpm exec jest --runInBand -t "C7 expired activation token returns 404"`
Proof: `pnpm exec jest --runInBand -t "C7 non-jwt activation token returns 404"`
Proof: `pnpm exec jest --runInBand -t "C7 missing activation token returns 404"`

**C8** - `POST /api/v1/user/activate` `{ email }` for `permission` `[]` returns `200` `{ message: "If an unactivated account exists for that email, a new link was sent." }`, a new email of the shape in C3 is sent, and the previous unexpired token still produces C5
Proof: `pnpm exec jest --runInBand -t "C8 resend sends a new email and the previous token still activates"`

**C9** - That call for an unknown email or for `permission` `["create:session:own"]` returns `200` `{ message: "If an unactivated account exists for that email, a new link was sent." }`, no email is sent, and `permission` is unchanged
Proof: `pnpm exec jest --runInBand -t "C9 resend for an unknown email sends nothing"`
Proof: `pnpm exec jest --runInBand -t "C9 resend for an activated account sends nothing"`

### S4 - Session · `app/api/v1/session/*`, `app/tests/v1/api/session/session.test.ts`, `app/tests/v1/api/users/getUsers.test.ts`, `app/tests/v1/api/users/updateUsers.test.ts` · 50 KB · ~12k

**C10** - Login of `permission` `["create:session:own"]` when `NODE_ENV` is `local` and `BASE_URL` is `http://localhost:8080` returns `200` `{}`, the body has no `session_token` and no `password`, and `Set-Cookie` is `better-auth.session_token` with `HttpOnly`, `Path=/`, and `Max-Age=2592000`, and the `Secure` attribute is absent
Proof: `pnpm exec jest --runInBand -t "C10 login sets better-auth.session_token without Secure"`

**C11** - A password that does not match returns the `401` body in C2 and has no `Set-Cookie`
Proof: `pnpm exec jest --runInBand -t "C11 wrong password returns 401 without a cookie"`

**C12** - A fourth successful login for an account that already has three live sessions returns `200` with `Set-Cookie`, and `GET /api/v1/user` with the oldest session's cookie is `200`
Proof: `pnpm exec jest --runInBand -t "C12 a fourth login leaves the oldest session valid"`

**C13** - `GET /api/v1/user` with a live cookie returns `200` `{ session: { updated_at, expires_at }, user: { username, email, permission, updated_at } }`, every timestamp matches `YYYY-MM-DDTHH:mm:ss.sssZ`, the body has no `password`, `permission` is the stored array, `expires_at` is within 60 seconds of 30 days after the response, the response sets `better-auth.session_token` again, and a second call returns an `expires_at` later than the first
Proof: `pnpm exec jest --runInBand -t "C13 live cookie returns the session user and slides expiry"`

**C14** - `GET /api/v1/user` with no cookie, an unknown cookie, or a cookie whose session is past `expires_at` returns the `401` body in C2
Proof: `pnpm exec jest --runInBand -t "C14 missing cookie returns 401"`
Proof: `pnpm exec jest --runInBand -t "C14 unknown cookie returns 401"`
Proof: `pnpm exec jest --runInBand -t "C14 expired session returns 401"`

**C15** - When the `users` row for a live session has been deleted, a request with that session's cookie is the `401` body in C2
Proof: `pnpm exec jest --runInBand -t "C15 deleted user session cookie returns 401"`

**C16** - A live cookie is accepted on `GET /api/v1/user` when the `User-Agent` differs from the one sent at login and when the header is absent. The response is `200`
Proof: `pnpm exec jest --runInBand -t "C16 a different user agent is accepted"`
Proof: `pnpm exec jest --runInBand -t "C16 a missing user agent is accepted"`

**C17** - `DELETE /api/v1/session/logout` with a live cookie returns `200`, `Set-Cookie` sets `better-auth.session_token` with `Max-Age=0`, a later request with that cookie is the `401` body in C2, and a different session's cookie still receives `200` from `GET /api/v1/user`
Proof: `pnpm exec jest --runInBand -t "C17 logout clears that session and keeps the other"`

**C18** - `DELETE /api/v1/session/logout` without a live cookie returns the `401` body in C2 and every session that existed before the call still receives `200` from `GET /api/v1/user`
Proof: `pnpm exec jest --runInBand -t "C18 logout without a cookie returns 401 and keeps sessions"`

**C19** - `PUT /api/v1/user/:username` `{ password }` with a live cookie returns `200` `{ username, email, updated_at }` with `updated_at` matching `YYYY-MM-DDTHH:mm:ss.sssZ` and no `password` in the body, login with the new password is C10, login with the old password is C11, that same cookie still receives `200` from `GET /api/v1/user`, and a different session's cookie receives the `401` body in C2
Proof: `pnpm exec jest --runInBand -t "C19 password change keeps the current session and drops the other"`

**C20** - `PUT /api/v1/user/:username` `{ username }` or `{ email }` and no `password` returns `200` `{ username, email, updated_at }` with `updated_at` matching `YYYY-MM-DDTHH:mm:ss.sssZ` and no `password` in the body, the returned `email` is the email stored after the call, no email is sent, and every session that existed before the call still receives `200` from `GET /api/v1/user`
Proof: `pnpm exec jest --runInBand -t "C20 username update sends no email and keeps sessions"`
Proof: `pnpm exec jest --runInBand -t "C20 email update sends no email and keeps sessions"`

**C21** - `GET /api/v1/user/:username` without a live cookie returns the `401` body in C2. With a live cookie it returns `200` `{ username, email, permission, created_at, updated_at }`, the timestamps match `YYYY-MM-DDTHH:mm:ss.sssZ`, and the body has no `password`
Proof: `pnpm exec jest --runInBand -t "C21 get user by username without a cookie returns 401"`
Proof: `pnpm exec jest --runInBand -t "C21 get user by username with a cookie returns 200"`

### S5 - users · `app/infra/migrations/1790471571198_replace-credentials-with-better-auth.ts` · 1 KB · ~1k

**C22** - After the forward migration, `users` has `username`, `email`, and `permission`, `users` has no `password` column, `user_activation_tokens` does not exist, a password verifier stored for a new account is neither the plaintext password nor `<password>.<APP_SECRET>`, and login with the password of a `users` row that existed before the migration is the `401` body in C2
Proof: `pnpm exec jest --runInBand -t "C22 migration drops password and activation tokens and old passwords cannot log in"`

## Swept

- validation: C4. A password shorter than 8 characters or longer than 128 is Unresolved 4. The library's minimum of 8 is the length `user1234` already has.
- failure modes: n/a — verification is recorded before `permission` is written, and the other sessions are deleted after the password is stored. This round does not require those pairs to share a commit, and it does not add a repair.
- idempotency and retry: C6, C8, C9
- authorization: C14, C17, C18, C21. `PUT /api/v1/user/:username` does not gain a session requirement. What a password change does to sessions when the request has no cookie is Unresolved 3.
- concurrency and ordering: existing — `users.username` and `users.email` are unique, so one of two simultaneous inserts with the same value is rejected by Postgres. C12 is four sessions coexisting, not two requests racing one insert.
- data lifecycle: C22
- external-dependency failure: existing — a thrown send becomes `503` `{ name: "service_unavailable_error", message: "The SMTPMailer is not available for connection right now.", action: "Notify the support team and try again later.", status_code: 503 }`
- state transitions: C1, C5, C6, C7, C8, C9
- observability: n/a — no new log line or metric. The pino logger stays as it is.

## Handoff

S1–S5 share the user and session modules. `wc -c` of the files those checks land in is 102848 bytes, about 26k tokens. The running total stays under 150k, so all five slices are one batch. No handoff boundary.
