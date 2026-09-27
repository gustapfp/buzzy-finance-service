# Authentication workflow

Walkthrough of the routes that shipped. The decision record is [authentication.md](authentication.md). Status: implemented, 2026-09-26.

Better Auth 1.7.6 sits behind the existing paths. The password is a row in `account`. The session is the library `session` table. The activation token is a signed JWT and is not a row. `users.username`, `users.email`, and `users.permission` stay on `users`.

A new account has `permission` `[]` until the activation link is used. After that, `permission` is `["create:session:own"]` and login sets a 30-day sliding cookie.

## Happy path

1. `POST /api/v1/user` with `{ username, email, password }`.
   Response `201` `{ username, created_at, updated_at }`. No `Set-Cookie`. The body has no `password`, `email`, `id`, or `permission`. Stored `permission` is `[]`. Stored `email` is the submitted email lowercased.
2. The API sends one email, subject `Ative a sua conta na Buzzy Finance`. The link is `WEBAPP_URL/register/activate?token=…`. The token lasts 15 minutes. Its payload `email` is lowercased and does not contain the username.
3. `PATCH /api/v1/user/activate?token=` with that token.
   Response `200` `{ message: "User activated successfully" }`. No `Set-Cookie`. `permission` becomes `["create:session:own"]`.
4. `POST /api/v1/session/login` with `{ email, password }`.
   Response `200` `{}`. The body has no `session_token` and no `password`. `Set-Cookie` is `better-auth.session_token` with `HttpOnly`, `Path=/`, and `Max-Age=2592000`. When `NODE_ENV` is `local` and `BASE_URL` is `http://localhost:8080`, `Secure` is absent.
5. `GET /api/v1/user` with that cookie.
   Response `200` `{ session: { updated_at, expires_at }, user: { username, email, permission, updated_at } }`. `expires_at` is about 30 days from the response, and a later call returns a later `expires_at`. The response sets the cookie again.

## Account

| When                                                                                      | Response                                                                                                                                                  | What changes                                                                         |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Login before the link is used                                                             | `401`, no `Set-Cookie`                                                                                                                                    | No session                                                                           |
| The same activation token after the account is already activated                          | `200` `{ message: "User activated successfully" }`                                                                                                        | `permission` unchanged                                                               |
| Expired token, token that is not a verification JWT, or missing `token`                   | `404` `{ name: "not_found_error", message: "Activation token not found or expired", action: "Please request a new activation token.", status_code: 404 }` | `permission` unchanged                                                               |
| `POST /api/v1/user/activate` `{ email }` for an unactivated account                       | `200` `{ message: "If an unactivated account exists for that email, a new link was sent." }`                                                              | A new email is sent. The previous token still activates                              |
| That resend for an unknown email, or for an account that already has `create:session:own` | The same `200`                                                                                                                                            | No email. `permission` unchanged                                                     |
| Username or email already stored, compared case-insensitively                             | `422` `{ name: "validation_error", message: "These fields are not valid: <fields>", action: "Fix the provided fields and try again.", status_code: 422 }` | No new `users` row. No email. `<fields>` is `email`, `username`, or `email,username` |

## Session

| When                                                                    | Response                                                              | What changes                                                                                                                                         |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Password does not match                                                 | `401`, no `Set-Cookie`                                                | No session                                                                                                                                           |
| A fourth login while three sessions are live                            | `200` and `Set-Cookie`                                                | The oldest cookie still receives `200` from `GET /api/v1/user`                                                                                       |
| No cookie, an unknown cookie, or a session past `expires_at`            | `401`                                                                 | The caller is not treated as that user                                                                                                               |
| The `users` row for a live session has been deleted                     | `401`                                                                 | That cookie is dead                                                                                                                                  |
| `User-Agent` differs from login, or the header is absent                | `200` on `GET /api/v1/user`                                           | The agent is not compared                                                                                                                            |
| `DELETE /api/v1/session/logout` with a live cookie                      | `200`. `Set-Cookie` sets `better-auth.session_token` with `Max-Age=0` | That session ends. A different session still receives `200`                                                                                          |
| Logout without a live cookie                                            | `401`                                                                 | No session is deleted                                                                                                                                |
| `PUT /api/v1/user/:username` `{ password }` with a live cookie          | `200` `{ username, email, updated_at }`                               | Login works with the new password and fails with the old one. The cookie that sent the change stays valid. Other sessions for that user become `401` |
| `PUT /api/v1/user/:username` `{ username }` or `{ email }`, no password | `200` `{ username, email, updated_at }`                               | No email. Every session that existed before the call still receives `200`                                                                            |
| `GET /api/v1/user/:username` without a live cookie                      | `401`                                                                 |                                                                                                                                                      |
| `GET /api/v1/user/:username` with a live cookie                         | `200` `{ username, email, permission, created_at, updated_at }`       | The body has no `password`                                                                                                                           |

The `401` body is `{ name: "unauthorized", message: "User Unauthorized to do this operation.", action: "Please try to login again or if you're facing any issue contact the support team.", status_code: 401 }`.

## Still open

`SameSite` on `better-auth.session_token` is not decided. The cookie is sent as `Strict` until that is confirmed. The login check does not assert `SameSite`.
