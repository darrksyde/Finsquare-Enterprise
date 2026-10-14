# Onboarding, demo mode and the corporate account

Code: `src/features/onboarding/`. State: **per community** — `onboardingCompleted`, `corporateDetails`, `corporateAccountStatus`, `organization` and the branding live in that community's slice in `WorkspaceProvider`; only `admin` (the person) is global. The workspace payload persists to `localStorage` under `finsquare-workspace`, with `finsquare-theme` beside it. See `communities.md`.

## Flow (`components/OnboardingFlow.tsx`)
This flow **is** the sign up. `app.tsx` renders the login gate first, and the login page's *Create an account* switch starts onboarding here; onboarding offers the link back to the login page. Finishing it also signs the new administrator in (`onboarding/completed` sets the session), so setup and registration are one action. See `authentication.md`.

Rendered by `app.tsx` instead of the shell while the active community's `onboardingCompleted` is false. A centered, single-column layout — brand header, horizontal numbered stepper and a progress bar — deliberately **not** the app sidebar, so it reads as a first-run experience rather than another workspace page. Below 860px the stepper collapses to a "Step X of 5 · <name>" line. Per-step validation lives in `domain/validation.ts` (zod; `validate()` returns field errors):

1. **Create account** — opens with a welcome hero, then name, work email, phone, password (≥ 8 chars; password is not stored in the mock).
2. **Set up organization** — name, type (Cooperative, Association, Union, MFI, Staff association, Farmers' group, Other), optional logo (≤ 512 KB), primary color (`AccentPicker`, presets + wheel + hex), optional secondary color, live brand preview. Branding applies to the real app immediately.
3. **Organization details** — required: registered name, email, phone, country, state, city, address. Optional (marked): registration number, website, year established, member count, area of operation, description.
4. **Corporate account & wallet (skippable)** — business, authorized representative, settlement account, verification documents (documents can be uploaded later). *Skip for now* or *Save and continue* (which submits and moves the status to "Under review").
5. **Finish** — summary and **Complete setup**.

## Demo mode
`environmentFor(corporateAccountStatus)` (`app/providers/workspace-store.ts`) derives the environment **from the active community**: Not connected → `demo`, Under review → `pending_review`, Connected → `live`. In demo, `moneyMovementMode` is `simulated`, so no real money moves. The `EnvironmentBanner` (top of the main area, not dismissible) explains what is possible and links to the Corporate account page via **Complete account setup**.

A community you create starts **Not connected**, so it is not live until its corporate account is verified. That is a product state, not an error: it is the same banner every other not-yet-live community shows.

## Starting another community
Starting a second community is **not** this flow. Onboarding runs once per community and collects the administrator account as well; a new community reuses the signed-in administrator and asks only for the community's own details. It lives in the switcher (`/communities/new`) — see `communities.md`.

## Returning to the corporate setup
- From the banner, or
- Settings → **Corporate account** tab (view `corporate`), implemented by `CorporatePage` using the same `CorporateAccountForm` as onboarding.
In the prototype, "Simulate approval" marks the account Connected and switches the workspace to live.

## Testing the flow again
Organization details → *Restart onboarding* (admin with `settings.manage`), or clear the `finsquare-*` localStorage keys.

## Production notes
Account creation, password handling, document upload and approval must be implemented by the backend (`corporate-account` repository already has an API implementation stub). Never trust the client-side environment value.
