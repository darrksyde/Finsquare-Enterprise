# Groups, branches, and administrators

## Domain relationships

```text
Organization
├── Branches
│   └── Parent/child branches
├── Groups
│   ├── Optional branch
│   └── Group memberships
├── Members
│   ├── Primary branch
│   └── Multiple group memberships
└── Administrators
    ├── Roles
    └── Organization or branch access scope
```

Branches model organizational structure. Groups model member collections formed for a purpose. A group can be organization-wide or associated with a branch. A member has one record and can participate in multiple groups through `GroupMembership`.

## Groups

`Group` stores purpose, type, optional branch, coordinator member IDs, status, and settings. `GroupMembership` links an existing organization member to a group and stores an extensible group role.

Default group types are seeded as organization-owned configuration values. Future custom types can be added without changing the `Group` contract.

Groups are archived rather than deleted when membership history exists. Coordinator assignment is represented through membership roles and a coordinator reference; no separate person record is created.

Permissions:

- `groups.view`
- `groups.create`
- `groups.update`
- `groups.delete`
- `groups.manage_members`

## Branches

`Branch.parentBranchId` models hierarchy. The branch repository rejects self-parenting and descendant-parenting so circular structures cannot be created.

Members, groups, and administrators reference branch IDs. They are not duplicated per branch. Branches with child branches or historical records are archived rather than deleted.

Permissions:

- `branches.view`
- `branches.create`
- `branches.update`
- `branches.delete`

## Administrators

Administrators are workspace operators and are separate from organization members, although both may eventually reference the same identity provider user.

Lifecycle:

```text
invited → active → suspended → active
                    └──────→ deactivated
```

Suspension and deactivation preserve administrator ID and user ID so historical activity remains attributable.

An administrator receives one or more roles and an `AccessScope`:

- `organization`: access across the tenant, subject to permissions.
- `branch`: access only to listed branch IDs, subject to permissions.

Frontend permission checks improve usability. The backend must enforce permission and scope authorization.

## Roles and permissions

Roles are organization-owned records with permissions, scope, timestamps, and a system/custom marker. The permission matrix groups permissions by domain so administrators do not need to scan one unstructured list.

Permissions:

- `administrators.view`
- `administrators.invite`
- `administrators.update`
- `administrators.suspend`
- `roles.view`
- `roles.create`
- `roles.update`
- `roles.delete`

## Data access and backend integration

Each feature follows:

```text
Page → hook → repository interface → mock repository
                                └── future API repository
```

DTO mappers are provided for groups, branches, and administrators. They isolate snake-case example API contracts from domain models. When backend endpoints are available, implement API repositories using these mappers and switch the service binding; pages and hooks remain unchanged.

## Audit events

`OrganizationAuditEvent` defines the domain envelope for creation, updates, archival, membership changes, invitations, role changes, suspension, and reactivation. Mock repositories do not persist a complete audit stream; the backend should record events transactionally.
