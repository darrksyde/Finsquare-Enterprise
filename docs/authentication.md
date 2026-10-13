# Authentication

Code: `src/features/auth/`. State: `WorkspaceProvider` (`session`) — **in memory only**, so reloading the page signs you out.

There is no backend yet, so authentication is a **mock behind the same repository boundary** as every other domain: `AuthPage` → `useAuth` → `auth.service` → `auth.repository` (`MockAuthRepository` | `ApiAuthRepository`).

## The gate

`app.tsx` decides what to render before the shell. The order matters:

1. **Public links** — `/apply/:slug`, `/join/:slug`, `/contribute/:slug` (and `/contribute/:slug/m/:memberId`). These return before anything else, so an applicant or contributor never has to log in.
2. **No session** → `AuthPage` (login) or, after the sign-up switch, `OnboardingFlow`.
3. **Signed in but setup unfinished** (`onboardingCompleted === false`) → `OnboardingFlow`.
4. Otherwise the shell.

A single `authScreen` flag (`"auto" | "signup"`) carries the explicit choice between the login page and sign-up:

- `AuthPage` → **Create an account** dispatches `onboarding/restarted` and shows the onboarding flow.
- `OnboardingFlow` → **Log in** returns to the login page.

## Log in, sign up, log out

- **Log in** — email + password, validated by `loginSchema` (`zod`) and submitted through `useAuth().signIn`. On success the service stores an access token that `apiClient` reads through `configureApiAuth`.
- **Sign up** — there is deliberately **no second sign-up form**. The onboarding flow already collects the administrator name, email, phone and password, so the login page hands over to it. Finishing onboarding (`onboarding/completed`) also sets the session, so completing sign-up signs you in.
- **Log out** — the sidebar's administrator block (bottom-left) opens a small menu with **Sign out**, and Settings has a **Sign out** action in its header. Logging out clears the session only: the organization, modules, branding and `onboardingCompleted` all survive, so logging back in returns to the workspace without redoing setup.

## Mock behaviour and limitations

- `MockAuthRepository` accepts **any** credentials that pass `loginSchema` (a valid email and a password of at least 8 characters) — there is no account store to check them against. Signing in derives the display name from the email local part (`ada.okoye@…` → `Ada Okoye`).
- The session is not persisted. Reloading the page returns to the login page, which is what makes the login screen easy to demonstrate.
- The mock's access token is a placeholder. `ApiAuthRepository` is the real boundary: the backend must verify the credentials, issue the token and return the identity.

## Production notes

- The backend owns authentication, authorization and session lifetime. The frontend session is a **UX gate only** — it must never be treated as a security boundary, and every request must be re-authorized server-side.
- Replace the mock by setting `VITE_ENABLE_MOCKS=false`; add `POST /auth/login` and `POST /auth/logout` to the API (see `endpoints.ts` and `api-integration.md`).
- There is no password reset, MFA, account lockout or refresh-token rotation yet — all backend concerns.
