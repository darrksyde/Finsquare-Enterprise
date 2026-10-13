# 013 — A login gate, a session-scoped session and sign-up through onboarding

Date: 2026-10-13
Status: Accepted

## Context

The application had no authentication at all: `app.tsx` rendered the onboarding flow while
`onboardingCompleted` was false and the shell after that. Anyone who opened the build was inside the
workspace, and there was no way to sign out. Onboarding step 1 already collected the administrator's
name, email, phone and password, and nothing consumed them.

## Decision

1. **The login page is a gate, not a page.** `AuthPage` renders before the shell, in the same
   first-run layout as onboarding. It is not a `View`, it has no route, no sidebar and no
   breadcrumbs, because it exists before the workspace does.
2. **The session is session-scoped** — held in `WorkspaceProvider` and deliberately not written to
   `localStorage`, so a reload returns to the login page.
3. **There is no second sign-up form.** The sign-up switch on the login page starts the existing
   onboarding flow, and `onboarding/completed` sets the session, so finishing setup signs you in.
   One screen creates the administrator account and there is exactly one place that does it — the
   same reasoning the member-application work applied to `membersService.create`
   (`011-member-application-forms.md`).
4. **Log out clears the session only.** Organization, modules, branding and `onboardingCompleted`
   stay, so signing back in returns to the workspace without redoing setup.
5. **Auth sits behind the standard repository boundary** (`MockAuthRepository` | `ApiAuthRepository`),
   so attaching a backend does not touch the UI, and the mock's permissiveness is contained in one
   class.

## Consequences

- Signals and money pages are unreachable without a session, but the public links
  (`/apply/`, `/join/`, `/contribute/`) stay open, so an external applicant or contributor never sees
  a login screen.
- Because the session is not persisted, the login screen is easy to demonstrate — and it also means
  the frontend cannot be trusted to remember an identity. The backend must own session lifetime.
- The mock accepts any well-formed credentials, which is documented in `authentication.md` as a
  limitation rather than left implicit.
