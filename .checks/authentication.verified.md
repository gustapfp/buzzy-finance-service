# Authentication Verification

**Verdict**: PASS
**Profile**: light
**Diff range**: `9f9656305b3381d1546fa352815b46d0b2eae12a..d2867af54b8d38d47f2a15c28fadb65a20f2e42b`
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

The fix diff is `ecb84a5d64c646add524b10f69f08aace61dd48f..d2867af54b8d38d47f2a15c28fadb65a20f2e42b`. It changes only `app/tests/v1/api/users/activation.test.ts` and `app/tests/v1/api/users/updateUsers.test.ts`.

## Binding sources

Carried from `ecb84a5`. Step 1 did not run because the profile is light. The fix does not touch an interface.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `docs/Roadmap/M2/M1I27/authentication.md` | no — step 1 did not run because the profile is light | — | — |

Coverage join did not run because the profile is light. Carried from `ecb84a5`.

## Checks

Proofs re-ran at `d2867af54b8d38d47f2a15c28fadb65a20f2e42b`. One Jest invocation: `pnpm exec jest --verbose --runInBand --json --testNamePattern '<the 32 names>'` — exit 0, `success true`, 32 passed, 0 failed. Each name below was printed `passed`. Checks the fix could not have touched keep the round-1 assertion and are marked carried. Citations in the two touched files were re-read at this commit.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | signup `201`, timestamps, no password/email/id/permission, no cookie, stored permission `[]`, email lowercased | re-run at `d2867af`, title `passed` | carried from `ecb84a5`: `createUsers.test.ts:169` `toBe(201)`; `:170` `toEqual` with `ISO_TIMESTAMP`; `:175`–`:178` `not.toHaveProperty`; `:179` `set-cookie` `toBeNull()`; `:182` `permission` `toEqual([])`; `:183` email `toBe(...toLowerCase())` | PASS — carried from `ecb84a5` |
| C2 | login before activation is the `401` body and no cookie | re-run at `d2867af`, title `passed` | carried from `ecb84a5`: `createUsers.test.ts:191` `toBe(401)`; `:192` `toEqual(UNAUTHORIZED_BODY)`; `:193` `set-cookie` `toBeNull()` | PASS — carried from `ecb84a5` |
| C3 | one activation email, subject, text, encoded link, payload email lowercased, no username, `exp` within 2s of `iat + 900` | re-run at `d2867af`, title `passed` | carried from `ecb84a5`: `createUsers.test.ts:200` `toHaveLength(1)`; `:204` subject; `:205` text; `:215`–`:217` payload email, no username, `toBeLessThanOrEqual(2)` | PASS — carried from `ecb84a5` |
| C4 | duplicate email, username, or both → `422`, no new row, no email | re-run at `d2867af`, 3 titles `passed` | carried from `ecb84a5`: `createUsers.test.ts:221` / `:223` / `:228` field lists; `:239` `toBe(422)`; `:240` validation body; `:246` count unchanged; `:247` `toHaveLength(0)` | PASS — carried from `ecb84a5` |
| C5 | live token `200`, message, no cookie, permission `["create:session:own"]` | re-run at `d2867af`, title `passed` | carried from `ecb84a5`; lines unchanged above the fix. `activation.test.ts:73` `toBe(200)`; `:74` message; `:75` `set-cookie` `toBeNull()`; `:76` `toEqual([PERMISSIONS.CREATE_OWN_SESSION])` (`authorization.ts:17` `"create:session:own"`) | PASS — carried from `ecb84a5` |
| C6 | already activated: `200`, same message, permission unchanged | re-run at `d2867af`, title `passed` | carried from `ecb84a5`; lines unchanged. `activation.test.ts:87` `toBe(200)`; `:88` message; `:89` `toEqual(before)` | PASS — carried from `ecb84a5` |
| C7 | expired, non-jwt, and missing token → `404` body, permission unchanged | re-run at `d2867af`, 3 titles `passed` | carried from `ecb84a5`; lines unchanged. `activation.test.ts:98` / `:108` / `:118` `toBe(404)`; `:99` / `:109` / `:119` `toEqual(ACTIVATION_NOT_FOUND)` (`:18`); `:100` / `:110` / `:120` `toEqual(before)` | PASS — carried from `ecb84a5` |
| C8 | resend `200`, every sent email matches C3, previous token still does C5 including no cookie | re-run at `d2867af`, title `passed` | re-judged at `d2867af`. `activation.test.ts:129` `toBe(200)`; `:130` `toEqual(RESEND_BODY)`; `:132` `toBeGreaterThanOrEqual(2)`; `:134`–`:151` loop `expect(item.subject).toBe("Ative a sua conta na Buzzy Finance")`, text `toBe` the C3 body with `` encodeURIComponent(token) ``, `:149` `payload.email` `toBe(seedUser.email.toLowerCase())`, `:150` `not.toHaveProperty("username")`, `:151` `Math.abs(payload.exp - (payload.iat + 900))` `toBeLessThanOrEqual(2)`; `:154` `toBe(200)`; `:155` message; `:156` `get("set-cookie")` `toBeNull()`; `:157` `toEqual([PERMISSIONS.CREATE_OWN_SESSION])` | PASS — verified at `d2867af` |
| C9 | unknown email and already activated: `200` same message, no email, permission unchanged | re-run at `d2867af`, 2 titles `passed` | assertions unchanged; citations refreshed because the C8 insertion moved them. `activation.test.ts:164` `toBe(200)`; `:165` `toEqual(RESEND_BODY)`; `:166` `toHaveLength(0)`. Activated path `:178`–`:181` `toBe(200)`, `toEqual(RESEND_BODY)`, `toHaveLength(0)`, `toEqual(before)` | PASS — carried from `ecb84a5`; citations refreshed at `d2867af` |
| C10 | login `200` `{}`, cookie name, `HttpOnly`, `Path=/`, `Max-Age=2592000`, no `Secure` | re-run at `d2867af`, title `passed` | carried from `ecb84a5`: `session.test.ts:75`–`:85` | PASS — carried from `ecb84a5` |
| C11 | wrong password is the C2 `401` body and no cookie | re-run at `d2867af`, title `passed` | carried from `ecb84a5`: `session.test.ts:190`–`:192` | PASS — carried from `ecb84a5` |
| C12 | fourth login `200` with `Set-Cookie`; oldest cookie still `200` | re-run at `d2867af`, title `passed` | carried from `ecb84a5`: `session.test.ts:159`–`:165` | PASS — carried from `ecb84a5` |
| C13 | live cookie returns session and user, timestamps, no password, expiry window, cookie set again, second `expires_at` later | re-run at `d2867af`, title `passed` | carried from `ecb84a5`: `session.test.ts:607`–`:626` | PASS — carried from `ecb84a5` |
| C14 | missing, unknown, and expired cookie → C2 `401` body | re-run at `d2867af`, 3 titles `passed` | carried from `ecb84a5`: `session.test.ts:631`–`:632`, `:637`–`:638`, `:650`–`:651` | PASS — carried from `ecb84a5` |
| C15 | deleted user, live cookie → C2 `401` body | re-run at `d2867af`, title `passed` | carried from `ecb84a5`: `session.test.ts:658`, `:663`–`:664` | PASS — carried from `ecb84a5` |
| C16 | different `User-Agent` and missing `User-Agent` both `200` | re-run at `d2867af`, 2 titles `passed` | carried from `ecb84a5`: `session.test.ts:670` `toBe(200)`; `:693` `toBe(200)` | PASS — carried from `ecb84a5` |
| C17 | logout `200`, `Max-Age=0`, that cookie later `401`, the other cookie `200` | re-run at `d2867af`, title `passed` | carried from `ecb84a5`: `session.test.ts:384`–`:393` | PASS — carried from `ecb84a5` |
| C18 | logout without a cookie is the C2 `401` body and existing sessions still `200` | re-run at `d2867af`, title `passed` | carried from `ecb84a5`: `session.test.ts:699`–`:702` | PASS — carried from `ecb84a5` |
| C19 | password change `200` shape, new password is C10 including cookie attributes, old password is C11, current cookie `200`, other cookie C2 `401` | re-run at `d2867af`, title `passed` | re-judged at `d2867af`. `updateUsers.test.ts:471` `toBe(200)`; `:472` `toEqual` username, email, `ISO_TIMESTAMP`; `:477` `not.toHaveProperty("password")`; `:484` `toBe(200)`; `:485` `toEqual({})`; `:486`–`:487` `not.toHaveProperty("session_token")` and `"password"`; `:483` cookie `startsWith("better-auth.session_token=")`; `:488` `toContain("HttpOnly")`; `:489` `toContain("Path=/")`; `:490` `toContain("Max-Age=2592000")`; `:491` `not.toMatch(/;\s*Secure(?:;\|$)/)`; `:494`–`:496` old login `toBe(401)`, `toEqual(UNAUTHORIZED_BODY)`, `set-cookie` `toBeNull()`; `:499` current `toBe(200)`; `:501`–`:502` other `toBe(401)` and `toEqual(UNAUTHORIZED_BODY)` | PASS — verified at `d2867af` |
| C20 | username or email update `200` shape including username, stored email, no mail, existing sessions still `200` | re-run at `d2867af`, 2 titles `passed` | re-judged at `d2867af`. Username path `updateUsers.test.ts:513` `toBe(200)`; `:514` `toEqual` `username: "renamed"`, stored email, `ISO_TIMESTAMP`; `:519` `not.toHaveProperty("password")`; `:520` `toHaveLength(0)`; `:521` and `:522` both `toBe(200)`. Email path `:544` `toBe(200)`; `:545` `toEqual` `username: seedUser.username`, `email: stored.rows[0].email`, `updated_at: expect.stringMatching(ISO_TIMESTAMP)`; `:550` `not.toHaveProperty("password")`; `:551` `toHaveLength(0)`; `:552` and `:553` both `toBe(200)` | PASS — verified at `d2867af` |
| C21 | get by username without cookie is C2 `401`; with cookie `200` shape, timestamps, no password | re-run at `d2867af`, 2 titles `passed` | carried from `ecb84a5`: `getUsers.test.ts:47`–`:55` and `:61`–`:62` | PASS — carried from `ecb84a5` |
| C22 | migration drops `password` and `user_activation_tokens`; verifier is neither plaintext nor `password.APP_SECRET`; pre-migration password login is C2 `401` | re-run at `d2867af`, title `passed` | carried from `ecb84a5`: `schema.test.ts:49`–`:50`, `:53`, `:56`–`:57`, `:66`–`:67` | PASS — carried from `ecb84a5` |
| C23 | compiled server signup returns `201` | re-run at `d2867af`: `pnpm build` exit 0; `node --env-file=.env.test dist/app/api/server.js`; `POST /api/v1/user` status `201`. Migrations POST was not needed. Server stopped after | response status `201`; body keys `created_at`, `updated_at`, `username` | PASS — carried from `ecb84a5`; proof re-run at `d2867af` |

## Swept

Carried from `ecb84a5`. The fix does not touch migrations or mail errors.

- concurrency and ordering — present at `app/infra/migrations/1783363266004_create-users.ts:15` `username` `unique: true` and `:25` `email` `unique: true`.
- external-dependency failure — present. `app/infra/email/mailManager.ts:18` and `:34` throw `ServiceUnavailableError(err, "SMTPMailer")`. `app/infra/errors/ServiceUnavailable.ts:7`–`:10` is the `503` body.

Not in scope (named only): social login, passkeys, and two-factor; new permission rules; a cap of three sessions; deleting the current session in the same commit as a password change; mounting the library at its own path; a forgot-password mail; `SameSite` asserted on the login cookie; password length `422` as a numbered criterion; `PUT` password with no cookie deleting sessions.

## Test policy rows

Test policy verdicts did not run because the profile is light. Carried from `ecb84a5`.

## Faults injected

Fault injection did not run because the profile is light. No faults were injected. Carried from `ecb84a5`.

## Gate

Verified at `d2867af`. `pnpm exec jest --verbose --runInBand --json --testNamePattern '<32 named tests>'` — 32 passed, 0 failed, exit 0. Each of the 32 titles printed `passed`.

`pnpm build` — exit 0. Compiled `POST /api/v1/user` — `201`.
