# 014 — A community is the tenant, and the tenant is state

**Status:** accepted

## Context

The product has always been multi-tenant in its data layer: every repository method takes
`organizationId` as its first argument, and the docs describe the organization as the primary tenant.
The frontend, though, was single-tenant in fact:

- `WorkspaceProvider` held **one** organization: its profile, modules, corporate account and
  compliance statuses, all flat.
- Every screen pinned its tenant with a module constant (`MEMBER_ORG_ID = "org-lagos-farmers"` and four
  siblings) or an inline `"org-lagos-farmers"` literal. Their own docstrings said the constant would be
  replaced by the organization from the session "when authentication lands".
- `useAuthorization()` always returned the first seeded administrator, a Super Admin, so permissions
  had no relationship to who was signed in.
- Mock stores were single-tenant: several ignored `organizationId` entirely, and those that filtered
  would have their whole collection replaced by another tenant's `commit`.

The request was a switcher listing the communities an administrator belongs to, with the role held in
each, the ability to switch, and the ability to create one. That cannot be a UI-only change: without a
tenant in the data path, switching would show one community's members, wallet and loans under another
community's name — a control without an effect, which this codebase treats as a bug.

## Decision

**The tenant is state, not a constant. The active community is the tenant.**

1. `WorkspaceProvider` holds **one slice per community** plus `activeCommunityId`. Actions that
   describe a community (`organization/updated`, `modules/replaced`, `corporate-account/*`,
   `compliance/document-updated`, `onboarding/*`, `preferences/accent-changed`) apply to whichever
   community is active.
2. The **context value flattens** the active slice onto the names consumers already read
   (`state.organization`, `state.enabledModules`, `state.environment`, …). The alternative — threading a
   community argument through every consumer — would have been a rewrite of forty screens for no
   behavioural gain.
3. `hooks/useOrganizationId.ts` supplies the tenant at the call site, and each hook carries it in its
   dependency list so switching reloads that screen's data.
4. **Roles are per community.** `useAuthorization()` composes the effective administrator from the
   active membership and the session identity, and resolves the role through `systemRolesFor(tenant)`.
5. **Mock stores are per tenant** (`createTenantStore({ seed, empty })`), seeded only for the seeded
   community. Every other community starts empty, and one community's write cannot reach another's
   rows.
6. `theme` stays global (a reading preference); `accent` becomes per community (branding).
7. The previous build's storage keys are **migrated** into the first community's slice, so an existing
   workspace keeps its profile, branding and setup.

**Creating a community reuses the administrator account** and takes everything else from scratch: empty
profile, default modules, corporate account not connected, no records. The creator becomes its Super
Admin. A person does not get a second identity by starting a second community.

## Consequences

- Switching community changes the data, the modules, the permissions and the branding together, because
  they are all read from the same slice.
- A newly created community is honestly empty: the Overview shows a get-started panel instead of six
  cards reading zero, and every module shows its own empty state.
- Public links (`/apply/:slug`, `/join/:slug`, `/contribute/:slug`) cannot use the active community —
  they carry no session. They keep addressing the seeded organisation until the backend resolves the
  tenant from the slug, and that exception is named `PUBLIC_LINK_ORG_ID` at each of those paths so it
  is visible rather than buried.
- Loans and wallets bind the tenant when the service is **resolved** (`loansServiceFor`,
  `walletServiceFor`) rather than taking it per call. This deviates from "organizationId is the first
  argument on every method", deliberately: the tenant is ambient, and a call site that could name a
  different tenant would be a way to read another community's money. A backend takes it from the
  session in both cases.
- The system roles are configuration every community has, so role ids are stable across tenants and a
  membership can store `role-super-admin` and have it resolve wherever it is used. An **Administrator**
  role was added to the set, because the switcher has to name the role between Super Admin and the
  specialists and the product already spoke of "inviting an administrator".
- The switcher shows one community per membership. Invitations, membership suspension, community
  deletion and cross-community reporting are **not** built, and `communities.md` says so.

## Alternatives considered

- **Thread the tenant through every consumer** (pass `organizationId` into every page). Rejected: a
  large mechanical diff across the whole app for no visible difference, and it makes the tenant a
  per-call argument that each screen could get wrong.
- **Seed a second community with its own records** so switching looked fuller. Rejected by the
  product owner: only the seeded community has data, and a second community shows honest empty states.
  Inventing records for it would put figures on screen that no record backs.
- **Keep the pinned constants and treat the switcher as display-only.** Rejected: switching would show
  another community's data, which is exactly the "no control without an effect" failure this codebase
  has been clearing out.
