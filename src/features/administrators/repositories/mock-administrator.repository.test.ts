import { describe, expect, it } from "vitest"
import { MockAdministratorRepository } from "./mock-administrator.repository"

const organizationId = "org-lagos-farmers"

describe("MockAdministratorRepository", () => {
  it("invites an administrator with a role and branch scope", async () => {
    const repository = new MockAdministratorRepository()
    const administrator = await repository.inviteAdministrator(organizationId, {
      firstName: "Mariam",
      lastName: "Bello",
      email: "mariam.bello@example.demo",
      roleIds: ["role-branch-admin"],
      accessScope: {
        type: "branch",
        organizationId,
        branchIds: ["branch-epe"],
      },
    })
    expect(administrator.status).toBe("invited")
    expect(administrator.roleIds).toContain("role-branch-admin")
    expect(administrator.accessScope.branchIds).toEqual(["branch-epe"])
  })

  it("rejects branch scope without an assigned branch", async () => {
    const repository = new MockAdministratorRepository()
    await expect(
      repository.inviteAdministrator(organizationId, {
        firstName: "Mariam",
        lastName: "Bello",
        email: "mariam2@example.demo",
        roleIds: ["role-branch-admin"],
        accessScope: { type: "branch", organizationId, branchIds: [] },
      }),
    ).rejects.toThrow("at least one branch")
  })

  it("suspends and reactivates while preserving identity", async () => {
    const repository = new MockAdministratorRepository()
    const suspended = await repository.suspendAdministrator(
      organizationId,
      "admin-taiwo",
    )
    expect(suspended.status).toBe("suspended")
    const reactivated = await repository.reactivateAdministrator(
      organizationId,
      "admin-taiwo",
    )
    expect(reactivated.status).toBe("active")
    expect(reactivated.id).toBe("admin-taiwo")
    expect(reactivated.userId).toBe(suspended.userId)
    const deactivated = await repository.deactivateAdministrator(
      organizationId,
      "admin-taiwo",
    )
    expect(deactivated.status).toBe("deactivated")
    expect(deactivated.userId).toBe(suspended.userId)
  })

  it("creates a custom scoped role", async () => {
    const repository = new MockAdministratorRepository()
    const role = await repository.createRole(organizationId, {
      name: "Project Coordinator",
      description: "Coordinates branch projects.",
      scope: "branch",
      permissions: ["groups.view", "groups.manage_members"],
    })
    expect(role.isSystemRole).toBe(false)
    expect(role.scope).toBe("branch")
    expect(role.permissions).toContain("groups.manage_members")
  })
})
