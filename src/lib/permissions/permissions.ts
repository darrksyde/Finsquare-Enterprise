import type { Administrator, Permission, Role } from "@/types"

interface PermissionSet {
  permissions: readonly Permission[]
}

export function hasPermission(
  role: PermissionSet | null,
  permission: Permission,
): boolean {
  return role?.permissions.includes(permission) ?? false
}

export function canAny(
  role: PermissionSet | null,
  permissions: Permission[],
): boolean {
  return permissions.some((permission) => hasPermission(role, permission))
}

export function canAll(
  role: PermissionSet | null,
  permissions: Permission[],
): boolean {
  return permissions.every((permission) => hasPermission(role, permission))
}

export function hasAdministratorPermission(
  administrator: Administrator,
  roles: Role[],
  permission: Permission,
  branchId?: string | null,
): boolean {
  const hasRolePermission = administrator.roleIds
    .map((roleId) => roles.find((role) => role.id === roleId))
    .some((role) => role?.permissions.includes(permission))

  if (!hasRolePermission) return false
  if (!branchId || administrator.accessScope.type === "organization")
    return true
  return administrator.accessScope.branchIds?.includes(branchId) ?? false
}

export function canAccessBranch(
  administrator: Administrator,
  branchId: string,
): boolean {
  return (
    administrator.accessScope.type === "organization" ||
    (administrator.accessScope.branchIds?.includes(branchId) ?? false)
  )
}
