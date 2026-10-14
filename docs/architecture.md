# Frontend architecture

## Principles

FinSquare uses a feature-oriented frontend with explicit boundaries:

1. Presentation components render domain models.
2. Hooks coordinate asynchronous state.
3. Services expose domain operations.
4. Repositories isolate data-source details.
5. The API client owns transport behavior and error normalization.

The UI does not construct backend URLs or consume raw DTOs.

## Composition root

`src/app/app.tsx` assembles routes, page components, overlays, and the application shell. `WorkspaceProvider` owns only cross-feature workspace state — the communities, which one is active, and the person signed in — and keeps the pure state logic in `app/providers/workspace-store.ts` so the reducer and the migration are testable without React. It uses a reducer so transitions are explicit and inspectable.

## State ownership

- **Component state:** open panels, wizard steps, selected tabs, filters.
- **Feature state:** data loading, errors, mutations, and retry logic in hooks.
- **Application state:** one slice per community (its profile, branding, modules, corporate account, compliance and the role held in it), which community is active, the signed-in session, and user preferences.
- **Server state:** repository-backed domain data. The current member repository uses mocks by default.

The **active community is the tenant**. The context value flattens that community's slice onto the names consumers read (`state.organization`, `state.enabledModules`, `state.environment`, …), and `useOrganizationId()` supplies the tenant id to whichever hook loads a screen's data. See `communities.md`.

## Domain boundaries

Shared types live in `src/types`. A feature may define private types locally. Backend DTOs are distinct from domain models and are mapped in API repositories.

Organization management uses ID-based relationships:

```text
Organization → Branch hierarchy
Organization → Groups → Group memberships → Members
Administrators → Roles → Permissions → Access scope
```

Branches are structural. Groups are purpose-based collections and may optionally reference a branch. Members are never duplicated between groups or branches.

## Routing

Paths are centralized in `app/config/routes.ts`. Navigation metadata is separate but uses the same view identifiers. Route protection composes authentication, organization membership, module availability, permissions, and environment capabilities.

Three short-circuits run before the shell in `app.tsx`, in this order: the public links (`/apply/`, `/join/`, `/contribute/`), the login gate, and the onboarding flow. See `authentication.md`.

## Accessibility

Reusable controls preserve visible focus states and semantic button, form, table, dialog, and status roles. Overlay components use `aria-modal`; notifications use polite live regions.

## Known transitional area

Several dense demo pages remain grouped by related feature rather than split into one file per small component. They are isolated from the composition root and can be decomposed further when production requirements stabilize.

## Current state (read this first)
- Single-page app; all data is mock data behind repositories. See `README.md` for the document map.
- Cross-feature workspace state (the communities and the active one, theme, the signed-in session) lives in `WorkspaceProvider`. Everything a community owns — its profile, branding, modules, corporate account, compliance and the role held in it — lives in that community's slice, not beside it. Anything else belongs in its feature.
- Navigation is a typed `View` union, not route components (see `routing-and-navigation.md`).
- New feature checklist: domain model → types → zod schema → repository interface + mock → service → hook → UI → view/route → permissions → module/nav config → loading/empty/error states → docs.
