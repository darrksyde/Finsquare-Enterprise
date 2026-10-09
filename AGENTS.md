# FinSquare Enterprise

> Full project handbook: see `docs/README.md` (architecture, routing, loans, wallet, onboarding, styling, deployment).

React 19 + TypeScript + Vite + Tailwind CSS v4 project.

## Commands

- `pnpm dev` — Vite dev server (port 5173, or the `PORT` environment variable)
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm lint` — ESLint over `src/`
- `pnpm test` — Vitest run
- `pnpm build` — production build to `dist/`
- `pnpm format` / `pnpm format:check` — oxfmt, configured by `.oxfmtrc.json`. Format **only the files you touched**; a repo-wide run rewrites ~260 unrelated files, and `format:check` is not a gate (see `docs/contributing.md`).

## Project Structure

This is the canonical project structure. Start with task-relevant files below. Only follow imports or inspect other files when required, when a documented path is missing, or when the repository contradicts this guide.

- `src/main.tsx` - React entrypoint; imports `src/index.css` and mounts `src/App.tsx` into the `#root` element
- `src/App.tsx` - Router entry: `BrowserRouter` (sub-path-aware basename) and `WorkspaceProvider`
- `src/app/app.tsx` - Composition root: maps the current view to a page and renders the app shell
- `src/index.css` - Global CSS entrypoint, Tailwind CSS v4 import and the design system classes
- `index.html` - Vite HTML shell containing the `#root` element and loading `src/main.tsx`
- `package.json` - Project dependencies and the Vite build, development, preview, and formatting scripts
- `vite.config.ts` - Vite configuration with React, Tailwind CSS v4, and the `@` alias for `src`
- `.mise.toml` - Toolchain versions for Node.js and pnpm

## Dependencies

- Runtime: React 19 and React DOM 19
- Styling: Tailwind CSS v4 with the `@tailwindcss/vite` plugin
- Build tooling: Vite 8, TypeScript 5.7, and `@vitejs/plugin-react`
- Routing: `react-router-dom`; Validation: `zod`; Tests: Vitest; Formatting: oxfmt

## Styling

Tailwind CSS v4 is wired through the `@tailwindcss/vite` plugin in `vite.config.ts` and imported in `src/index.css` with `@import 'tailwindcss';`. Most UI is built from the semantic classes and design tokens defined in `src/index.css`; follow `docs/ui-and-styling.md` rather than adding ad-hoc styles. Keep CSS `@import` statements first in `src/index.css`, then `@font-face` rules and font-family defaults.

## Code quality

- Use double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in single-quoted strings. An unescaped apostrophe in a single-quoted string breaks the build.
- Ensure JSX tags are closed and braces are balanced.
- Export components as default exports.

# FinSquare Enterprise — AI Development Guide

You are working on **FinSquare Enterprise**, a configurable financial and community management platform for organizations such as cooperatives, associations, unions, MFIs, staff associations, farmers' groups, and other member-based organizations.

This document explains the product, codebase, development rules, and how future developers or AI agents should work on the project.

## 1. Product Principle

FinSquare Enterprise helps organizations manage:

* Organizations
* Members
* Groups
* Branches
* Administrators
* Contributions
* Dues
* Payments
* Savings
* Loans
* Repayments
* Guarantors
* Events
* Communication
* Documents
* Reports
* Forms
* Workflows
* Compliance

The platform is **configurable**. Different organizations may have different modules, workflows, permissions, and financial operations.

Do not assume every organization uses every feature.

The organization is the primary tenant.

```text
Organization
├── Members
├── Groups
├── Branches
├── Administrators
├── Enabled Modules
├── Permissions
├── Workflows
├── Transactions
└── Reports
```

## 2. Core Development Principles

Always follow these principles:

1. **Do not unnecessarily redesign existing features.**
2. **Reuse existing components, patterns, utilities, and dependencies.**
3. **Keep features modular and isolated.**
4. **Keep business logic separate from UI components.**
5. **Never hardcode business logic inside pages when it belongs in services, hooks, configuration, or domain logic.**
6. **Build frontend features so they can easily connect to a real backend later.**
7. **Do not tightly couple the UI to mock data.**
8. **Use strong TypeScript types.**
9. **Keep permissions and organization context centralized.**
10. **Prefer simple solutions over unnecessary abstraction.**
11. **Do not introduce a new library when an existing project dependency can solve the problem.**
12. **Maintain consistency with the existing design system and UX.**
13. **Do not modify unrelated features while implementing a task.**
14. **Do not create duplicate components or utilities when an existing one can be reused.**

## 3. Code Architecture

Follow this general flow:

```text
UI Component
    ↓
Hook
    ↓
Service / Repository
    ↓
API Client
    ↓
Backend
```

During frontend-only development:

```text
UI Component
    ↓
Hook
    ↓
Service / Repository
    ↓
Mock Data
```

The UI should not know whether data comes from mocks or an API.

### Recommended structure

```text
src/
├── app/
│   ├── routes/
│   ├── providers/
│   ├── layouts/
│   ├── config/
│   └── app.tsx
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── navigation/
│   ├── feedback/
│   └── data-display/
│
├── features/
│   ├── organization/
│   ├── members/
│   ├── groups/
│   ├── branches/
│   ├── contributions/
│   ├── dues/
│   ├── payments/
│   ├── savings/
│   ├── loans/
│   ├── repayments/
│   ├── guarantors/
│   ├── communication/
│   ├── events/
│   ├── documents/
│   ├── reports/
│   ├── forms/
│   ├── workflows/
│   ├── administrators/
│   ├── roles-permissions/
│   ├── compliance/
│   ├── corporate-account/
│   └── onboarding/
│
├── services/
│   ├── api/
│   ├── auth/
│   ├── storage/
│   └── notifications/
│
├── lib/
│   ├── http/
│   ├── validation/
│   ├── formatting/
│   ├── permissions/
│   └── utils/
│
├── hooks/
├── types/
├── mocks/
├── constants/
├── assets/
└── styles/
```

Not every folder must exist immediately. Follow the existing codebase when it already has an established equivalent.

## 4. Feature Structure

A major feature should generally follow:

```text
features/members/
├── components/
├── hooks/
├── services/
├── repositories/
├── schemas/
├── types/
├── mocks/
└── index.ts
```

Keep feature-specific logic inside the feature.

Shared UI belongs in:

```text
components/
```

Shared utilities belong in:

```text
lib/
```

Shared domain types belong in:

```text
types/
```

## 5. Organization Context

Every organization is isolated from other organizations.

Do not build features that assume there is only one organization.

The application should be designed around an organization context such as:

```ts
organizationId
```

Backend requests should eventually include organization/tenant context where required.

Never allow frontend organization switching to bypass backend authorization.

## 6. Modules

Modules are configurable per organization.

Examples:

```text
Members
Groups
Branches
Contributions
Dues
Payments
Savings
Loans
Events
Communication
Documents
Reports
```

Use a centralized module registry where appropriate.

For example:

```ts
{
  id: "loans",
  name: "Loans",
  category: "finance",
  dependencies: ["members", "payments"]
}
```

Navigation, feature visibility, and settings should be driven by enabled modules and permissions instead of scattered hardcoded conditions.

## 7. Permissions

Permissions should be granular.

Examples:

```text
members.view
members.create
members.update
members.delete

contributions.view
contributions.create
contributions.approve
contributions.export

loans.view
loans.create
loans.approve
loans.reject
loans.disburse
loans.recover
```

Frontend permission checks are primarily for UX.

**The backend must always enforce authorization.**

Never treat frontend permission checks as a security boundary.

## 8. Demo Mode

Organizations may configure their environment before going live.

Supported environments:

```ts
type OrganizationEnvironment =
  | "demo"
  | "pending_review"
  | "live"
  | "suspended";
```

Demo mode can allow:

* Adding members
* Creating groups
* Configuring modules
* Creating workflows
* Creating loan products
* Building forms
* Inviting administrators

Demo mode must not allow real financial transactions.

Use centralized capability checks where appropriate:

```ts
canPerform("financial_transaction")
canPerform("loan_disbursement")
canPerform("payment")
```

Do not scatter environment checks throughout the application.

## 9. Members

A member existing in the system does not necessarily mean they have a FinSquare login.

Important principle:

> Account does not equal login.

Members may be:

1. Admin-managed
2. Assisted through secure links
3. Full self-service users

External applicants may also exist for features such as loan applications.

Do not assume every applicant or guarantor has a FinSquare account.

Organizations add members two ways: an administrator types the details, or the organization publishes an **application form** and shares its link. Both create the member through the same member service, so there is exactly one way a member record comes into existence. An application form is built with the **shared form builder** — the same one the loan application form uses — and it always includes the two fields a member cannot exist without (full name and phone number), which the builder cannot remove. New members join the group the form was publishing with; an applicant is never asked to pick an internal group. See `docs/member-applications.md`.

## 10. Loans

The loan system supports:

```text
Loan Product
↓
Application
↓
Eligibility
↓
Guarantor
↓
Review
↓
Approval
↓
Offer
↓
Disbursement
↓
Active Loan
↓
Repayment Schedule
↓
Repayments
↓
Overdue / Default
↓
Recovery
↓
Completed
```

Loan applications can support:

* Internal applicants
* External applicants
* Custom application forms
* Required personal information
* Custom questions
* Document requirements
* External guarantors
* Guarantor verification
* Approval workflows
* Repayment schedules
* Recovery

Loan Form Builder should remain simple and intuitive.

Reusable questions should be stored in a question library.

Submitted applications should preserve the form version used when they were submitted.

## 11. Mock Data

Mock data is temporary infrastructure, not business logic.

Keep mocks behind repositories/services.

Prefer:

```text
Component
→ Hook
→ Repository
→ Mock Repository
```

Later:

```text
Component
→ Hook
→ Repository
→ API Repository
```

Changing from mock data to a real backend should not require rewriting the UI.

## 12. API / Backend Readiness

The frontend should communicate with a centralized API client.

Example:

```text
services/api/
├── client.ts
├── endpoints.ts
├── types.ts
└── index.ts
```

Feature services should use the API abstraction rather than making raw requests throughout components.

Avoid:

```ts
fetch("/api/members")
```

inside random components.

Prefer:

```ts
memberService.getMembers()
```

or:

```ts
memberRepository.getMembers()
```

## 13. Adding the Backend Later

When a backend is introduced, **do not rewrite the frontend architecture**.

Replace the mock repository/service implementation with an API-backed implementation.

Example:

```text
MemberRepository
├── MockMemberRepository
└── ApiMemberRepository
```

The frontend should depend on the interface:

```ts
interface MemberRepository {
  getMembers(): Promise<Member[]>
  getMember(id: string): Promise<Member>
  createMember(data: CreateMemberInput): Promise<Member>
  updateMember(id: string, data: UpdateMemberInput): Promise<Member>
}
```

Then the implementation can change from:

```text
MockMemberRepository
```

to:

```text
ApiMemberRepository
```

without changing the UI.

## 14. Backend Responsibilities

When the backend is eventually implemented, it must become the source of truth for:

* Authentication
* Authorization
* Organization isolation
* Permissions
* Roles
* Financial calculations
* Transaction processing
* Loan calculations
* Repayment schedules
* Payment validation
* Compliance
* Audit logs
* Data validation
* File access
* Sensitive operations
* Financial state changes

Never rely on frontend calculations for authoritative financial data.

The frontend can calculate values for previews, but the backend must recalculate and validate them before committing financial operations.

## 15. Database Design

The backend database should reflect the domain rather than the frontend screens.

Core entities may include:

```text
organizations
organization_users
members
groups
group_members
branches
administrators
roles
permissions
role_permissions

contributions
dues
payments
savings

loan_products
loan_applications
loan_application_forms
loan_application_form_versions
loan_form_fields
loan_form_responses
loan_documents
loan_guarantors
loans
loan_repayment_schedules
loan_repayments
loan_recovery_records

audit_logs
notifications
documents
```

Use stable IDs and proper relationships.

Financial records should be treated as sensitive historical records and should not be casually deleted.

Prefer status changes, archival, reversal, or correction records where appropriate.

## 16. Backend API Design

Keep API contracts explicit and versionable.

For example:

```text
/api/v1/organizations
/api/v1/members
/api/v1/groups
/api/v1/branches
/api/v1/contributions
/api/v1/loans
/api/v1/loan-products
/api/v1/loan-applications
/api/v1/repayments
```

Use consistent:

* Request formats
* Response formats
* Error formats
* Pagination
* Filtering
* Sorting
* Validation
* Authentication
* Authorization

Document API contracts before replacing large sections of mock functionality.

## 17. Security

Never expose secrets in frontend code.

Never trust:

* Frontend permissions
* Frontend organization IDs
* Frontend financial calculations
* Frontend role information
* Client-side validation

The backend must validate all sensitive operations.

Financial operations should be auditable.

Important actions should produce audit records containing information such as:

```text
actor
organization
action
entity
entityId
timestamp
previousState
newState
metadata
```

## 18. UI / UX Rules

FinSquare Enterprise should feel like a serious enterprise workspace.

Prioritize:

* Clear hierarchy
* Dense but readable information
* Consistent tables
* Clear statuses
* Useful filters
* Search
* Bulk actions
* Responsive layouts
* Good empty states
* Loading states
* Error states
* Confirmation for destructive actions
* Clear success feedback

Do not introduce unnecessary animations or decorative UI.

Do not redesign the entire product when implementing a feature.

Follow the existing visual language.

## 19. Working on a Task

Before changing code:

1. Understand the existing feature.
2. Find existing components and patterns.
3. Reuse what already exists.
4. Identify the correct feature boundary.
5. Determine whether the change affects shared types or services.
6. Make the smallest clean change required.
7. Keep the implementation backend-ready.
8. Test the affected flow.
9. Avoid unrelated refactoring.

When requirements are ambiguous, make the simplest assumption that is consistent with the existing product.

Do not invent large systems without a product requirement.

## 20. Adding a New Feature

When adding a new feature:

```text
1. Define the domain model
2. Define types
3. Define validation
4. Define repository/service interface
5. Create mock implementation if backend is unavailable
6. Build hooks
7. Build UI
8. Add routes
9. Add permissions
10. Add navigation/module configuration
11. Add loading/error/empty states
12. Document important decisions
```

## 21. Changing Existing Features

Do not break existing workflows.

Before changing a shared component or type, check where it is used.

If a change affects multiple modules, prefer a backward-compatible approach when practical.

Avoid copy-pasting slightly different versions of the same component.

## 22. Documentation

Maintain useful project documentation.

Recommended:

```text
docs/
├── architecture.md
├── modules.md
├── permissions.md
├── onboarding.md
├── api-integration.md
└── contributing.md
```

Important architectural decisions should be documented rather than left only in code.

## 23. AI Development Rules

When an AI agent works on this repository:

* Read the relevant existing code before modifying it.
* Do not assume a component does not exist without checking.
* Do not create duplicate utilities.
* Do not change unrelated files.
* Do not replace working architecture simply because another pattern is preferred.
* Do not introduce dependencies without a clear reason.
* Keep changes focused.
* Preserve existing functionality.
* Use existing naming conventions.
* Use existing design tokens and components.
* Keep TypeScript strict and meaningful.
* Avoid `any` unless there is a documented reason.
* Do not hardcode values that belong in configuration or domain models.
* Do not put business rules directly into presentation components.
* Do not implement backend behavior in the frontend.
* Do not expose secrets.
* Do not assume mock data represents the final database structure.
* When backend integration begins, preserve the existing service/repository boundary.

## 24. Definition of Done

A feature is not complete simply because the page renders.

Before considering a feature complete, verify:

* The UI works.
* Loading states work.
* Empty states work.
* Error states work.
* Validation works.
* Permissions are considered.
* Organization context is respected.
* Demo/live restrictions are respected.
* Mock/API boundaries are clean.
* Types are correct.
* Existing components are reused where appropriate.
* No unrelated functionality was broken.
* The implementation can later connect to a real backend without rewriting the feature.

## Final Rule

**Build FinSquare Enterprise as a real product, not a collection of disconnected screens.**

Every new feature should fit into the existing organization, module, permission, service, repository, and domain architecture.

The goal is to keep the codebase:

**simple, modular, maintainable, scalable, secure, and easy for another developer or AI agent to understand.**

