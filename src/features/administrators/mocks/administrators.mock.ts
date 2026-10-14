import type { Administrator, Role } from "@/types"
import { SEED_ORGANIZATION_ID } from "@/lib/tenancy/seed-tenant"
import { systemRolesFor } from "@/lib/permissions/system-roles"

const organizationId = SEED_ORGANIZATION_ID

/**
 * Lagos Farmers Cooperative. The first record is the administrator the workspace signs in as, and
 * `roleIds` points at one of the system roles in `@/lib/permissions/system-roles`, which every
 * community has.
 */
export const administratorsMock: Administrator[] = [
  {
    id: "admin-adesola",
    organizationId,
    userId: "user-adesola",
    name: "Adesola Ogunleye",
    email: "adesola@lagosfarmers.demo",
    phone: "+234 803 100 0011",
    roleIds: ["role-super-admin"],
    status: "active",
    accessScope: { type: "organization", organizationId },
    lastActiveAt: "2025-05-26T10:42:00.000Z",
    createdAt: "2022-08-01T09:00:00.000Z",
    updatedAt: "2025-05-26T10:42:00.000Z",
  },
  {
    id: "admin-taiwo",
    organizationId,
    userId: "user-taiwo",
    name: "Taiwo Akinyemi",
    email: "taiwo@lagosfarmers.demo",
    roleIds: ["role-finance"],
    status: "active",
    accessScope: { type: "organization", organizationId },
    lastActiveAt: "2025-05-25T16:18:00.000Z",
    createdAt: "2023-01-09T09:00:00.000Z",
    updatedAt: "2025-05-25T16:18:00.000Z",
  },
  {
    id: "admin-funmi",
    organizationId,
    userId: "user-funmi",
    name: "Funmi Adeyemi",
    email: "funmi@lagosfarmers.demo",
    roleIds: ["role-finance-manager"],
    status: "active",
    accessScope: { type: "organization", organizationId },
    lastActiveAt: "2025-05-26T08:05:00.000Z",
    createdAt: "2023-02-01T09:00:00.000Z",
    updatedAt: "2025-05-26T08:05:00.000Z",
  },
  {
    id: "admin-bola",
    organizationId,
    userId: "user-bola",
    name: "Bola Ajayi",
    email: "bola.ajayi@lagosfarmers.demo",
    roleIds: ["role-branch-admin"],
    status: "active",
    accessScope: {
      type: "branch",
      organizationId,
      branchIds: ["branch-ikeja"],
    },
    lastActiveAt: "2025-05-24T12:10:00.000Z",
    createdAt: "2023-03-14T09:00:00.000Z",
    updatedAt: "2025-05-24T12:10:00.000Z",
  },
  {
    id: "admin-chinwe",
    organizationId,
    userId: "user-chinwe",
    name: "Chinwe Nwosu",
    email: "chinwe@lagosfarmers.demo",
    roleIds: ["role-auditor"],
    status: "invited",
    accessScope: { type: "organization", organizationId },
    invitedAt: "2025-05-23T09:00:00.000Z",
    createdAt: "2025-05-23T09:00:00.000Z",
    updatedAt: "2025-05-23T09:00:00.000Z",
  },
  {
    id: "admin-kunle",
    organizationId,
    userId: "user-kunle",
    name: "Kunle Salami",
    email: "kunle@lagosfarmers.demo",
    roleIds: ["role-membership"],
    status: "suspended",
    accessScope: { type: "organization", organizationId },
    lastActiveAt: "2025-04-19T11:30:00.000Z",
    createdAt: "2024-02-11T09:00:00.000Z",
    updatedAt: "2025-05-01T09:00:00.000Z",
  },
]

/**
 * The seeded community's roles. Kept as the named export the permission tests and the wallet access
 * screen already read; the tenant-scoped list comes from `administratorsService.getRoles()`.
 */
export const rolesMock: Role[] = systemRolesFor(organizationId)
