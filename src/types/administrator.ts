import type { EntityId } from "./common"
import type { Permission } from "./permission"

export const ADMINISTRATOR_STATUSES = [
  "invited",
  "active",
  "suspended",
  "deactivated",
] as const
export type AdministratorStatus = typeof ADMINISTRATOR_STATUSES[number]

export type RoleScope = "organization" | "branch"

export interface AccessScope {
  type: RoleScope
  organizationId: EntityId
  branchIds?: EntityId[]
}

export interface Administrator {
  id: EntityId
  organizationId: EntityId
  userId: EntityId
  name: string
  email: string
  phone?: string
  roleIds: EntityId[]
  status: AdministratorStatus
  accessScope: AccessScope
  lastActiveAt?: string | null
  invitedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface Role {
  id: EntityId
  organizationId: EntityId
  name: string
  description?: string
  permissions: Permission[]
  scope: RoleScope
  isSystemRole: boolean
  createdAt: string
  updatedAt: string
}

export interface InviteAdministratorInput {
  firstName: string
  lastName: string
  email: string
  phone?: string
  roleIds: EntityId[]
  accessScope: AccessScope
}

export interface UpdateAdministratorInput {
  name?: string
  phone?: string
  roleIds?: EntityId[]
  accessScope?: AccessScope
}
