# Modules and feature map

## Module registry
`src/app/config/module-registry.ts` defines every module (`id`, `group`, `name`, `description`, `icon`, `dependencies`). Enabled modules are held in workspace state (`enabledModules`, default `DEFAULT_ENABLED_MODULES`). Enabling a module with missing dependencies, or disabling one that others depend on, prompts `DependencyModal`. Navigation, permissions and pages must be driven from this registry, not ad-hoc conditions.

Module ids: wallet, members, groups, branches, contributions, dues, payments, savings, loans, repayments, guarantors, communication, events, documents, forms, reports.

> The **`forms` module id** has no page of its own. The form builder is shared code in
> `src/features/forms/`, and the member application form is reached from **Members**. The id is kept
> because `enabledModules` is persisted in `localStorage`.

> The **`communication` module id is stable** — `enabledModules` is persisted in `localStorage`
> (`finsquare-org`), so renaming the id would silently disable the module for anyone with saved
> state. Its display name is **Communications** and its sidebar item is **Messaging**.

## Feature map (`src/features/*`)
| Feature | Notes |
| --- | --- |
| `members` | List (search, status filter, page), profile `/members/:id` — identity, access, and the member's own contributions, loans, wallet and activity, plus **Record payment**. Domain maths in `domain/member-obligations.ts` and `domain/member-activity.ts`; cross-module payment in `services/member-payments.service.ts`. **Add member** opens a chooser: add manually, or use an application form. Applications (`/members/applications`) and application forms (`/members/forms`) are sub-pages of the same sidebar item — see `member-applications.md`. Schemas in `schemas/`. |
| `forms` | **Shared form builder**: the form vocabulary, generic helpers, the builder components, the applicant renderer, the submitted-answer display and the organization's question library. Consumed by `loans` and `members`; import it by deep path, never through a barrel (see `decisions/011-member-application-forms.md`). |
| `branches`, `groups` | Lazy-loaded pages, repositories with mock implementations and tests |
| `administrators` | Administrators, roles (`RolesPage`), `useAuthorization` hook |
| `organization` | Modules page, structure page, **Organization details** (`OrganizationProfile.tsx`) |
| `onboarding` | Onboarding flow, demo banner, shared corporate-account form, validation (see `onboarding.md`) |
| `compliance` | Compliance documents and the **Corporate account & wallet** page |
| `corporate-account` | Repository/service for the corporate account application (mock + API implementations) |
| `loans` | Entire loan domain (see `loans.md`) |
| `wallet` | Main wallet, branch wallets, transactions, access controls (see `wallet.md`) |
| `contributions` | Contribution plans, contributors, payouts, commission, public contribution links (see `contributions.md`) |
| `communications` | Messaging workspace: compose, history, SMS balance, contribution and loan reminders (see `communications.md`). Sidebar section **Communications** → item **Messaging** |
| `reports` | Central reports page (Loans, Wallet, Contributions) |
| `settings` | Appearance & branding, accent picker, settings tabs |
| `financial-operations` | Dues page and the dues/loan methods behind it |
| `workflows` | Workflow builder (generic) |
| `overview` | Dashboard |

## Shared code
- `src/components/ui` — `Button`, `Field`, `SelectField`, `Badge`, `Modal`, `Toggle`, `SectionHeader`, `IconButton`, `Progress`.
- `src/components/layout` — `AppShell` (Sidebar, Brand), `OrgAvatar`.
- `src/components/navigation` — `Breadcrumbs`.
- `src/components/feedback` — async states, application overlays (Add member, import, dependency modals).
- `src/components/data-display` — table/filter primitives (`FilterBar`, `SearchInput`).
- `src/types` — shared domain types. `src/lib/permissions` — permissions. `src/services/api` — API client.
