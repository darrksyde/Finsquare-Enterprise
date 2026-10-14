import { describe, expect, it } from "vitest"
import { permissionCatalog } from "./permission-catalog"
import {
  SYSTEM_ROLE_DEFINITIONS,
  systemRoleById,
  systemRolesFor,
} from "./system-roles"

const catalog = permissionCatalog.flatMap((group) => group.permissions)

describe("system roles", () => {
  it("gives every community the same roles", () => {
    const lagos = systemRolesFor("org-lagos-farmers")
    const greenfield = systemRolesFor("org-greenfield")

    expect(greenfield.map((role) => role.id)).toEqual(lagos.map((role) => role.id))
    expect(greenfield.map((role) => role.name)).toEqual(lagos.map((role) => role.name))
    expect(lagos.map((role) => role.name)).toContain("Super Admin")
    expect(lagos.map((role) => role.name)).toContain("Administrator")
  })

  it("stamps the community it was asked for, not a fixed tenant", () => {
    const roles = systemRolesFor("org-greenfield")
    expect(roles.every((role) => role.organizationId === "org-greenfield")).toBe(true)
    expect(roles.every((role) => role.isSystemRole)).toBe(true)
  })

  it("resolves a role id within a community and rejects an unknown one", () => {
    expect(systemRoleById("org-greenfield", "role-super-admin")?.name).toBe("Super Admin")
    expect(systemRoleById("org-greenfield", "role-does-not-exist")).toBeNull()
  })

  it("keeps role ids unique inside a community", () => {
    const ids = systemRolesFor("org-lagos-farmers").map((role) => role.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(SYSTEM_ROLE_DEFINITIONS.map((role) => role.id)).size).toBe(SYSTEM_ROLE_DEFINITIONS.length)
  })

  it("covers the whole permission catalog with the Super Admin and nothing unknown", () => {
    const superAdmin = systemRoleById("org-lagos-farmers", "role-super-admin")
    for (const permission of catalog) {
      expect(superAdmin?.permissions).toContain(permission)
    }
    for (const role of systemRolesFor("org-lagos-farmers")) {
      for (const permission of role.permissions) {
        expect(catalog).toContain(permission)
      }
    }
  })

  it("withholds settings and role management from the Administrator role", () => {
    const administrator = systemRoleById("org-lagos-farmers", "role-admin")
    expect(administrator?.permissions).toContain("members.view")
    expect(administrator?.permissions).not.toContain("settings.manage")
    expect(administrator?.permissions).not.toContain("roles.create")
  })

  it("does not share permission arrays between communities", () => {
    const first = systemRolesFor("org-one")
    const second = systemRolesFor("org-two")
    expect(first[0].permissions).not.toBe(second[0].permissions)
    const length = second[0].permissions.length
    first[0].permissions.push("members.view")
    expect(second[0].permissions.length).toBe(length)
  })
})
