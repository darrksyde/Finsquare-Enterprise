# Communities

A **community is the tenant**. Cooperatives, associations, unions and MFIs are all communities, and
the organization is the unit of isolation: its members, money, modules and permissions are its own.

One administrator can belong to several communities and hold a **different role in each**. The sidebar
switcher is how they move between them.

## The switcher

`features/communities/components/CommunitySwitcher.tsx` replaces what used to be a button that simply
opened Organization settings. It shows:

- the active community's avatar, name and **the role held there**;
- every community the administrator belongs to, with its role, and a marker on the active one;
- **Create a community**.

Switching takes effect immediately: the whole workspace follows. There is no partial state, because
the active community *is* the tenant every repository is asked about.

## What belongs to a community

`WorkspaceProvider` holds one **slice per community** (`WorkspaceCommunity` in
`app/providers/workspace-store.ts`):

| Field | Why it is per community |
| --- | --- |
| `organization` | Name, type, registration, contact details, logo — the community's own record |
| `accent` | The primary brand colour, collected per organisation during onboarding |
| `enabledModules` | Which modules this community has switched on |
| `corporateAccountStatus` + `corporateDetails` | Whether this community can move real money yet |
| `complianceDocuments` | This community's own document statuses |
| `onboardingCompleted` | Setup progress, which is per community |
| role (`roleId`, `roleName`, `isOwner`, `scope`, `branchIds`) | What the administrator may do **here** |

`theme` is deliberately **not** per community — it is a reading preference, not branding. `admin` and
`session` are the person, not the tenant.

The context value flattens the active slice onto the names consumers already use (`state.organization`,
`state.enabledModules`, `state.environment`, …), so a page never has to know that communities exist.

## Where the tenant comes from now

`hooks/useOrganizationId.ts` returns the active community id. Every screen passes it to the hook that
loads its data, and the id is part of that hook's dependencies — which is what makes switching reload
the page's data instead of leaving the previous community's rows on screen.

The `*_ORG_ID` constants (`MEMBER_ORG_ID`, `DUES_ORG_ID`, `CONTRIBUTION_ORG_ID`,
`COMMUNICATION_ORG_ID`, `FORMS_ORG_ID`) and the inline `"org-lagos-farmers"` literals are gone. Their
own docstrings said they would be replaced by the organization from the session once authentication
landed; this is that step, with the switcher as the session's tenant.

**Public links are the exception.** `/apply/:slug`, `/join/:slug` and `/contribute/:slug` carry no
session, so the tenant cannot come from the active community: it belongs to the organisation that
published the link. Resolving it from the slug is the backend's job; until then those links address
the seeded organisation, which is where the published forms and pools live. The constant that says so
is local to each of those paths and named `PUBLIC_LINK_ORG_ID` so the exception is visible.

## Mock tenancy

The frontend-only build ships **one** community with records in it: `org-lagos-farmers`, named by
`lib/tenancy/seed-tenant.ts`. Every other community — the second seeded membership, and every one you
create — genuinely starts empty, and the app says so with real empty states rather than borrowing
another community's data.

Mock stores are keyed by tenant through `lib/tenancy/tenant-store.ts`
(`createTenantStore({ seed, empty })`). Before this, a store that ignored `organizationId` answered
every tenant with the same rows, and one that replaced a whole collection would wipe the seeded
community's records the first time a second community wrote anything. Both are now impossible: a
community's data is created the first time it is asked for, and one community's write cannot reach
another's rows.

Two things are configuration rather than records, and exist in **every** community:

- **System roles** — `lib/permissions/system-roles.ts`. Seven roles (Super Admin, Administrator,
  Finance Officer, Finance Manager, Membership Officer, Branch Administrator, Auditor) materialised per
  tenant, so a membership recorded against `role-super-admin` resolves wherever it is used.
- **Default group types** — `GroupRepository.getGroupTypes(organizationId)` stamps the platform's
  defaults with whichever tenant asked.

Loans and wallets bind the tenant when the service is **resolved** (`loansServiceFor`,
`walletServiceFor`) rather than repeating it on every call, because the tenant is ambient: a loan or
wallet screen always works inside the community the switcher has active, and a call site that could
name a different tenant would be a way to read another community's money. A backend takes the tenant
from the authenticated session in both cases.

## Roles drive the interface

`useAuthorization()` builds the effective administrator from the **active membership** and the session
identity, and resolves the role with `systemRolesFor(activeCommunityId)`. So the same person can be a
Super Admin in one community and a Finance Officer in another, and the sidebar, the pages and the
action buttons follow the role they hold:

| Role | Sees |
| --- | --- |
| Super Admin | Everything, including roles and settings |
| Administrator | The workspace day to day, without roles or organization settings |
| Finance Officer | Members read-only, contributions, dues, loans, wallet, reports |
| Finance Manager | The above plus wallet approvals, access and limits |
| Membership Officer | Members, groups, branches, communication |
| Branch Administrator | Operational access limited to assigned branches |
| Auditor | Read-only, across records and reports |

As everywhere in this product, this is a **usability** boundary. The backend re-authorises every
request against the authenticated session and must never trust a client-side role.

## Creating a community

**Create a community** in the switcher opens `/communities/new`, a narrow form page (see
`ui-and-styling.md` § *Form pages*). It collects the community's own details — name, type, registered
name, country, logo and primary colour — and nothing else.

- The **administrator account is reused**. A person does not get a second identity by starting a second
  community; they become that community's Super Admin through the membership.
- Everything else is **new**: empty profile fields, default modules enabled, corporate account not
  connected, and no records. The new community therefore starts **not live**, which is the existing
  product state — the banner offers to connect a corporate account.
- Creating it makes it active and returns you to its Overview, which shows a get-started panel rather
  than zeros.

Registration happens through `communities/created`, which adds the community's slice **and** makes it
active in one step — the create response is the only place its name, registered name, country and
primary colour exist, because no other screen has loaded that community's records yet. The switcher
list itself is the workspace store's, read once from the membership endpoint, so a community created
later in the same session is registered rather than re-fetched.

## Persistence

`finsquare-workspace` holds `{ communities, activeCommunityId, admin }`. `finsquare-theme` stays its
own key.

The single-community keys of the previous build (`finsquare-org`, `finsquare-onboarding`,
`finsquare-accent`) are read **once**, folded into the first community's slice, and then removed — so
an existing workspace keeps its profile, branding, corporate account and setup progress. The function
that does it (`migrateLegacyWorkspace`) runs only when the current key is absent.

The **session is still not persisted**: reloading the page signs you out, and the active community is
restored from storage on the next sign-in.

## Not built

Stated plainly rather than implied:

- **No invitations.** A community appears in your switcher because the backend says you belong to it;
  there is no in-app flow to invite someone else to a community you administer, or to accept one.
- **No membership suspension.** The role gates the UI; nothing models a suspended membership.
- **No community deletion, archival or transfer.**
- **No cross-community reporting.** Every figure is one community's.
- Public links address the seeded organisation until the backend resolves the tenant from the slug.

## Where to look

| Concern | File |
| --- | --- |
| Membership types | `features/communities/types.ts` |
| Repository + mock + API | `features/communities/repositories/` |
| The switcher | `features/communities/components/CommunitySwitcher.tsx` |
| Create a community | `features/communities/components/CreateCommunityPage.tsx` |
| Per-community state | `app/providers/workspace-store.ts` |
| The tenant of the current screen | `hooks/useOrganizationId.ts` |
| Tenant keys for mocks | `lib/tenancy/` |
| Roles per community | `lib/permissions/system-roles.ts` |
| What the administrator may do | `features/administrators/hooks/useAuthorization.ts` |

See `decisions/014-communities-and-active-tenant.md` for why the tenant became state, and
`authentication.md` for how signing in, signing up and the session work.
