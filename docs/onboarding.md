# Onboarding, demo mode and the corporate account

Code: `src/features/onboarding/`. State: `WorkspaceProvider` (`onboardingCompleted`, `admin`, `corporateDetails`, `corporateAccountStatus`, `organization`, `environment`), persisted to `localStorage` (`finsquare-onboarding`, `finsquare-org`, `finsquare-theme`, `finsquare-accent`).

## Flow (`components/OnboardingFlow.tsx`)
This flow **is** the sign up. `app.tsx` renders the login gate first, and the login page's *Create an account* switch starts onboarding here; onboarding offers the link back to the login page. Finishing it also signs the new administrator in (`onboarding/completed` sets the session), so setup and registration are one action. See `authentication.md`.

Rendered by `app.tsx` instead of the shell while `onboardingCompleted` is false. A centered, single-column layout — brand header, horizontal numbered stepper and a progress bar — deliberately **not** the app sidebar, so it reads as a first-run experience rather than another workspace page. Below 860px the stepper collapses to a "Step X of 5 · <name>" line. Per-step validation lives in `domain/validation.ts` (zod; `validate()` returns field errors):

1. **Create account** — opens with a welcome hero, then name, work email, phone, password (≥ 8 chars; password is not stored in the mock).
2. **Set up organization** — name, type (Cooperative, Association, Union, MFI, Staff association, Farmers' group, Other), optional logo (≤ 512 KB), primary color (`AccentPicker`, presets + wheel + hex), optional secondary color, live brand preview. Branding applies to the real app immediately.
3. **Organization details** — required: registered name, email, phone, country, state, city, address. Optional (marked): registration number, website, year established, member count, area of operation, description.
4. **Corporate account & wallet (skippable)** — business, authorized representative, settlement account, verification documents (documents can be uploaded later). *Skip for now* or *Save and continue* (which submits and moves the status to "Under review").
5. **Finish** — summary and **Complete setup**.

## Demo mode
`environmentFor(corporateAccountStatus)` (WorkspaceProvider) derives the environment: Not connected → `demo`, Under review → `pending_review`, Connected → `live`. In demo, `moneyMovementMode` is `simulated`, so no real money moves. `DemoBanner` (top of the main area, not dismissible) explains this and links to the Corporate account page via **Complete Account Setup**.

## Returning to the corporate setup
- From the banner, or
- Settings → **Corporate account** tab (view `corporate`), implemented by `CorporatePage` using the same `CorporateAccountForm` as onboarding.
In the prototype, "Simulate approval" marks the account Connected and switches the workspace to live.

## Testing the flow again
Organization details → *Restart onboarding* (admin with `settings.manage`), or clear the `finsquare-*` localStorage keys.

## Production notes
Account creation, password handling, document upload and approval must be implemented by the backend (`corporate-account` repository already has an API implementation stub). Never trust the client-side environment value.
