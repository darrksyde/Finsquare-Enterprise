import {
  currentAdministratorMock,
  rolesMock,
} from "../mocks/administrators.mock"
import {
  canAccessBranch,
  hasAdministratorPermission,
} from "@/lib/permissions/permissions"
import type { Permission } from "@/types"

export function useAuthorization() {
  return {
    administrator: currentAdministratorMock,
    can: (permission: Permission, branchId?: string | null) =>
      hasAdministratorPermission(
        currentAdministratorMock,
        rolesMock,
        permission,
        branchId,
      ),
    canAccessBranch: (branchId: string) =>
      canAccessBranch(currentAdministratorMock, branchId),
  }
}
