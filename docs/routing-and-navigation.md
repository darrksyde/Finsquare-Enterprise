# Routing and navigation

## View enum routing
The app uses `react-router-dom`'s `BrowserRouter` (`src/App.tsx`) but routes through a typed `View` union instead of route components.

- `src/types/navigation.ts` — the `View` union. Every screen has a view id.
- `src/app/config/routes.ts` — `viewPaths` (view → path), `resolveView(pathname)`, `buildViewPath(view, id?)`. Detail views use `:id` paths; `resolveView` has explicit regex fallbacks for them.
- `src/app/routes/useAppRoute.ts` — returns `{ view, entityId, navigate }`. `entityId` is the last path segment.
- `src/app/app.tsx` — an `if / else if` chain on `view` that picks the page. Public path `/apply/:slug` short-circuits before the shell, and the onboarding flow short-circuits when `onboardingCompleted` is false.

**Adding a screen:** add the view to the union → add a path in `viewPaths` → render it in `app.tsx` → add access rules (below) → add a breadcrumb parent/label if it is a sub-page. If the same component serves two views, give it `key={view}` so state resets.

Pages render **one** header through `components/layout/ShellPage.tsx`; the breadcrumb bar above it owns "where am I / back", so pages must not add their own back button or a second header. See `ui-and-styling.md` for the rules.

**Published sub-path:** `src/App.tsx` derives the router `basename` from Vite's `BASE_URL`, and only applies it if the current URL starts with it. Do not remove this; published apps are served from a sub-path.

## Sidebar (`src/app/config/navigation.ts`)
`navigationSections` drives the sidebar. A section **with a label** is a collapsible dropdown (auto-expands when it contains the active view); a section **without a label** renders its items directly.

Current sidebar: Overview · Organization ▾ (Members, Branches, Groups) · Finance ▾ (Contributions, Dues, Payments, Savings) · Wallet · Loans ▾ (Overview, Applications, Active loans, Disbursements, Repayments) · Communications ▾ (Messaging) · Reports · Settings.

The sidebar's `Documents` item sits in the Communications section but is not in
`DEFAULT_ENABLED_MODULES`, so it is not rendered. Enabled modules come from that constant and from
the Modules settings page (the `modules/replaced` action) — `organizationMock.enabledModules` is not
read anywhere.

Wallet is one sidebar item; Branch wallets, Transactions and Access & controls are reached from the Wallet page and registered in `secondaryAccess`. A member's own wallet is not a Wallet sub-page — it lives on the member profile (`/members/:id`, Wallet tab), so every one of a member's money surfaces is in one place.

Contributions is a **single sidebar item with no module tab row**: `/contributions` is the front door and the only module-level page, with the plan itself at `/contributions/:id` (see `contributions.md`). Retired views — `contributions-all`, `contributions-active`, `contribution-payouts`, `contribution-withdrawals`, `contribution-transactions` — resolve to the front door.

Rule: **only primary destinations go in the sidebar.** Anything reachable from another page (detail pages, sub-pages, settings tabs) is registered in `secondaryAccess` instead:

```ts
"wallet-transactions": { module: "wallet", permission: "wallet.view", nav: "wallet" }
```
`nav` is the sidebar item that should look active. `canAccessView(view, enabledModules, can)` checks nav items first, then `secondaryAccess`. `parentView(view)` returns the active sidebar item.

## Settings tabs
Settings is one sidebar item. `SETTINGS_TABS` (General, Organization, Administrators, Roles & permissions, Modules, Corporate account, Compliance) and `settingsTabFor(view)` render `SettingsTabs` above the page. Tabs are filtered with `canAccessView`.

## Breadcrumbs and Back
`breadcrumbTrail(view)`, `crumbParent(view)` and `viewLabel(view)` (bottom of `navigation.ts`) are driven by two maps, `crumbParents` and `crumbLabels`. `components/navigation/Breadcrumbs.tsx` renders the trail on every page except Overview, with a **Back** button to the parent when one exists. Back is deterministic (goes to the parent view), not browser history. Add new sub-pages to both maps.

## Reports
All reports are centralized in `features/reports/pages/ReportsPage.tsx`. The page header carries an **area select** (Loans / Wallet / Contributions, each shown only when its module is enabled and permitted) and the chosen module contributes its own single tab row. Module report components accept an `embedded`/`bare` mode so they can be hosted there. Do not add per-module report entries to the sidebar, and do not give the hub its own tab row — two tab rows on one screen is what the page rules forbid.

## Public pages
Public paths short-circuit the app shell in `app.tsx`, before onboarding and the layout:

- `/apply/:slug` — public loan application (`features/loans`).
- `/join/:slug` — public member application form (`features/members`); the form must be published with its link switched on, otherwise the page says the link is closed.
- `/contribute/:slug` — public contribution page (`features/contributions`), and `/contribute/:slug/m/:memberId` for a member's own link, which identifies the member and records against their balance. The pool link needs the plan to be `Open`; a member link works for any member on an active plan. Both work without an account.

## Member application views
`members` is the only Members sidebar item. `member-applications` (`/members/applications`),
`member-application-detail` (`/members/applications/:id`) and `member-application-forms`
(`/members/forms`) are `secondaryAccess` entries with `nav: "members"` (see `member-applications.md`).

**Order matters in `resolveView`.** The exact-path lookup and the `/members/applications/:id` pattern
are tested *before* the `pathname.startsWith("/members/")` fallback. Reversing that makes
`/members/applications` resolve to a member profile whose `entityId` is `"applications"`.
