# M2

## M2I29 — Setup Google and Microsoft provider

Confirmed by the user, 2026-09-27. Plan from [social-login.md](M2I29/social-login.md). That document wins if this list and it disagree.

A person signs in with Google or Microsoft and receives the same session cookie as password login, with `permission` `["create:session:own"]`. A new person chooses a username after the provider returns. No `users` row exists until that username is accepted. An email the provider marks verified attaches to the existing user and does not change their username.

### Google Cloud Console

1. Create an OAuth client of type Web application.
2. Add an authorized redirect URI for each environment: `{BASE_URL}/api/auth/callback/google`. Local `BASE_URL` is `http://localhost:8080`, so the local URI is `http://localhost:8080/api/auth/callback/google`. Do not copy the Better Auth sample (`localhost:3000`).
3. Put the client id and secret in `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.development`, `.env.prod`, and the CI `TEST_ENV` secret. Do not commit them.

### Microsoft Entra

1. Register an app that accepts personal Microsoft accounts and work or school accounts.
2. Add a web redirect URI for each environment: `{BASE_URL}/api/auth/callback/microsoft`. Local is `http://localhost:8080/api/auth/callback/microsoft`.
3. Create a client secret.
4. Allow the ID token to include the optional `email` claim. Entra omits it otherwise. This API still refuses the return unless that token marks the email verified.
5. Put the application id and secret in `MICROSOFT_CLIENT_ID` and `MICROSOFT_CLIENT_SECRET` in the same three places as the Google secrets. Do not commit them.

### Webapp

1. On the logged-out login screen, add two controls. Each is a full page navigation, not a background request, to `GET /api/v1/session/login/google` or `GET /api/v1/session/login/microsoft` on this API.
2. Add `WEBAPP_URL/register/username`. It reads `token` from the query, asks for a username once, and submits `POST /api/v1/user/social` with `{ username, token }`. A 422 stays on this screen with the same token. A 200 continues the way password login does.
3. Add `WEBAPP_URL/login` as the screen a refused return lands on (no email, unverified email, or consent denied). No session. The person can try again.
4. After a success the browser lands on `WEBAPP_URL` with the session cookie already set. Call `GET /api/v1/user` the same way password login does.

### This API

Specified in [social-login.md](M2I37/social-login.md). Not repeated here.
