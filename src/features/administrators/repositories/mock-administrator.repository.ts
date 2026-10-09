import type {
  Administrator,
  InviteAdministratorInput,
  Role,
  UpdateAdministratorInput,
} from "@/types"
import { administratorsMock, rolesMock } from "../mocks/administrators.mock"
import type { AdministratorRepository } from "./administrator.repository"

export class MockAdministratorRepository implements AdministratorRepository {
  private administrators = structuredClone(administratorsMock)
  private roles = structuredClone(rolesMock)

  async getAdministrators(organizationId: string) {
    return structuredClone(
      this.administrators.filter(
        (administrator) => administrator.organizationId === organizationId,
      ),
    )
  }

  async getAdministrator(organizationId: string, id: string) {
    return structuredClone(
      this.administrators.find(
        (administrator) =>
          administrator.organizationId === organizationId &&
          administrator.id === id,
      ) ?? null,
    )
  }

  async inviteAdministrator(
    organizationId: string,
    input: InviteAdministratorInput,
  ) {
    if (
      this.administrators.some(
        (administrator) =>
          administrator.organizationId === organizationId &&
          administrator.email.toLowerCase() === input.email.toLowerCase(),
      )
    ) {
      throw new Error("An administrator with this email already exists.")
    }
    this.assertRoles(organizationId, input.roleIds)
    if (
      input.accessScope.type === "branch" &&
      !input.accessScope.branchIds?.length
    ) {
      throw new Error("Branch-scoped access requires at least one branch.")
    }
    const now = new Date().toISOString()
    const administrator: Administrator = {
      id: `admin-${crypto.randomUUID()}`,
      organizationId,
      userId: `invited-user-${crypto.randomUUID()}`,
      name: `${input.firstName} ${input.lastName}`,
      email: input.email,
      phone: input.phone,
      roleIds: input.roleIds,
      status: "invited",
      accessScope: input.accessScope,
      invitedAt: now,
      createdAt: now,
      updatedAt: now,
    }
    this.administrators.unshift(administrator)
    return structuredClone(administrator)
  }

  async updateAdministrator(
    organizationId: string,
    id: string,
    input: UpdateAdministratorInput,
  ) {
    const administrator = this.requireAdministrator(organizationId, id)
    if (input.roleIds) this.assertRoles(organizationId, input.roleIds)
    if (
      input.accessScope?.type === "branch" &&
      !input.accessScope.branchIds?.length
    ) {
      throw new Error("Branch-scoped access requires at least one branch.")
    }
    Object.assign(administrator, input, {
      updatedAt: new Date().toISOString(),
    })
    return structuredClone(administrator)
  }

  async suspendAdministrator(organizationId: string, id: string) {
    return this.setStatus(organizationId, id, "suspended")
  }

  async reactivateAdministrator(organizationId: string, id: string) {
    return this.setStatus(organizationId, id, "active")
  }

  async deactivateAdministrator(organizationId: string, id: string) {
    return this.setStatus(organizationId, id, "deactivated")
  }

  async resendInvitation(organizationId: string, id: string) {
    const administrator = this.requireAdministrator(organizationId, id)
    if (administrator.status !== "invited") {
      throw new Error("Only pending invitations can be resent.")
    }
    administrator.invitedAt = new Date().toISOString()
    administrator.updatedAt = administrator.invitedAt
  }

  async getRoles(organizationId: string) {
    return structuredClone(
      this.roles.filter((role) => role.organizationId === organizationId),
    )
  }

  async createRole(
    organizationId: string,
    input: Pick<Role, "name" | "description" | "scope" | "permissions">,
  ) {
    const now = new Date().toISOString()
    const role: Role = {
      ...input,
      id: `role-${crypto.randomUUID()}`,
      organizationId,
      isSystemRole: false,
      createdAt: now,
      updatedAt: now,
    }
    this.roles.push(role)
    return structuredClone(role)
  }

  async updateRole(organizationId: string, role: Role) {
    const index = this.roles.findIndex(
      (item) => item.organizationId === organizationId && item.id === role.id,
    )
    if (index < 0) throw new Error("Role not found.")
    this.roles[index] = {
      ...role,
      updatedAt: new Date().toISOString(),
    }
    return structuredClone(this.roles[index])
  }

  private async setStatus(
    organizationId: string,
    id: string,
    status: Administrator["status"],
  ) {
    const administrator = this.requireAdministrator(organizationId, id)
    administrator.status = status
    administrator.updatedAt = new Date().toISOString()
    return structuredClone(administrator)
  }

  private requireAdministrator(organizationId: string, id: string) {
    const administrator = this.administrators.find(
      (item) => item.organizationId === organizationId && item.id === id,
    )
    if (!administrator) throw new Error("Administrator not found.")
    return administrator
  }

  private assertRoles(organizationId: string, roleIds: string[]) {
    if (
      roleIds.some(
        (roleId) =>
          !this.roles.some(
            (role) =>
              role.organizationId === organizationId && role.id === roleId,
          ),
      )
    ) {
      throw new Error("One or more selected roles are invalid.")
    }
  }
}
