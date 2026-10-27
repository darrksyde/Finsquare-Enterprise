import { apiClient, endpoints } from "@/services/api"
import { ApiError } from "@/services/api/types"
import { roleForMfiRole, type MfiRole } from "@/features/communities/domain/mfi-membership"
import { systemRolesFor } from "@/lib/permissions/system-roles"
import type {
  Administrator,
  InviteAdministratorInput,
  Role,
  UpdateAdministratorInput,
} from "@/types"
import type { AdministratorRepository } from "./administrator.repository"

/** `GET /staff` payload item, after the client unwraps `{ success, data }`. */
interface MfiStaffDto {
  membershipId: string
  isActive: boolean
  id: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  phoneNumber: string
  createdAt: string
  isBanned: boolean
  mfiRole: MfiRole
  mfiPermissions: string[]
}

/** The system role ids the MFI roles resolve onto; the Roles page shows exactly these. */
const MFI_ROLE_IDS = ["role-super-admin", "role-finance", "role-auditor"]

/** Maps an Enterprise system role id back onto the MFI staff role it came from. */
function mfiRoleForRoleId(roleId: string): MfiRole {
  switch (roleId) {
    case "role-super-admin":
      return "OWNER"
    case "role-auditor":
      return "SUPPORT"
    default:
      // role-finance and any role the MFI model has no direct equivalent for.
      return "LOAN_OFFICER"
  }
}

function mapStaff(dto: MfiStaffDto, organizationId: string): Administrator {
  const role = roleForMfiRole(dto.mfiRole)
  return {
    id: dto.id,
    organizationId,
    userId: dto.id,
    name: dto.fullName,
    email: dto.email,
    phone: dto.phoneNumber,
    roleIds: [role.roleId],
    status: !dto.isActive ? "deactivated" : dto.isBanned ? "suspended" : "active",
    accessScope: { type: "organization", organizationId },
    lastActiveAt: null,
    invitedAt: null,
    createdAt: dto.createdAt,
    updatedAt: dto.createdAt,
  }
}

function notAvailable(feature: string): never {
  throw new ApiError(`${feature} is not available on the MFI backend yet.`, "not_found")
}

/**
 * API-backed administrator repository, wired to the MFI staff endpoints.
 *
 * The MFI backend models staff as memberships with one of three roles (`OWNER`, `LOAN_OFFICER`,
 * `SUPPORT`) and a flat permission list; the Enterprise role catalog is mapped onto those three
 * system roles. Branch-scoped access and custom roles have no MFI equivalent yet.
 */
export class ApiAdministratorRepository implements AdministratorRepository {
  async getAdministrators(organizationId: string): Promise<Administrator[]> {
    const staff = await apiClient.get<MfiStaffDto[]>(endpoints.administrators.list)
    return staff.map((dto) => mapStaff(dto, organizationId))
  }

  async getAdministrator(
    organizationId: string,
    id: string,
  ): Promise<Administrator | null> {
    try {
      const dto = await apiClient.get<MfiStaffDto>(endpoints.administrators.detail(id))
      return mapStaff(dto, organizationId)
    } catch (error) {
      if (error instanceof ApiError && error.code === "not_found") return null
      throw error
    }
  }

  async inviteAdministrator(
    organizationId: string,
    input: InviteAdministratorInput,
  ): Promise<Administrator> {
    const roleId = input.roleIds[0] ?? "role-finance"
    const response = await apiClient.post<{ staff: { id: string; fullName: string; email: string; phoneNumber: string; createdAt: string } }>(
      endpoints.administrators.invite,
      {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        role: mfiRoleForRoleId(roleId),
      },
    )
    return {
      id: response.staff.id,
      organizationId,
      userId: response.staff.id,
      name: response.staff.fullName,
      email: response.staff.email,
      phone: response.staff.phoneNumber,
      roleIds: input.roleIds,
      status: "invited",
      accessScope: input.accessScope,
      createdAt: response.staff.createdAt,
      updatedAt: response.staff.createdAt,
    }
  }

  async updateAdministrator(
    organizationId: string,
    id: string,
    input: UpdateAdministratorInput,
  ): Promise<Administrator> {
    if (input.roleIds?.length) {
      await apiClient.patch(endpoints.administrators.role(id), {
        role: mfiRoleForRoleId(input.roleIds[0]),
      })
    }
    // The caller refreshes the list; return a best-effort record with the new access.
    return {
      id,
      organizationId,
      userId: id,
      name: "",
      email: "",
      roleIds: input.roleIds ?? [],
      status: "active",
      accessScope: input.accessScope ?? { type: "organization", organizationId },
      createdAt: "",
      updatedAt: "",
    }
  }

  async suspendAdministrator(organizationId: string, id: string): Promise<Administrator> {
    await apiClient.post(endpoints.administrators.suspend(id))
    return { id, organizationId, userId: id, name: "", email: "", roleIds: [], status: "suspended", accessScope: { type: "organization", organizationId }, createdAt: "", updatedAt: "" }
  }

  async reactivateAdministrator(organizationId: string, id: string): Promise<Administrator> {
    await apiClient.post(endpoints.administrators.reactivate(id))
    return { id, organizationId, userId: id, name: "", email: "", roleIds: [], status: "active", accessScope: { type: "organization", organizationId }, createdAt: "", updatedAt: "" }
  }

  async deactivateAdministrator(organizationId: string, id: string): Promise<Administrator> {
    await apiClient.post(endpoints.administrators.deactivate(id))
    return { id, organizationId, userId: id, name: "", email: "", roleIds: [], status: "deactivated", accessScope: { type: "organization", organizationId }, createdAt: "", updatedAt: "" }
  }

  async resendInvitation(_organizationId: string, id: string): Promise<void> {
    await apiClient.post(endpoints.administrators.resendInvite(id))
  }

  async getRoles(organizationId: string): Promise<Role[]> {
    return systemRolesFor(organizationId).filter((role) => MFI_ROLE_IDS.includes(role.id))
  }

  async createRole(): Promise<Role> {
    return notAvailable("Custom roles")
  }

  async updateRole(): Promise<Role> {
    return notAvailable("Custom roles")
  }
}
