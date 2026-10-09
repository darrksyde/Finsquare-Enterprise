import { describe, expect, it } from "vitest"
import { canPerform } from "./capabilities"
import {
  canAccessBranch,
  canAll,
  canAny,
  hasAdministratorPermission,
  hasPermission,
} from "./permissions"
import {
  administratorsMock,
  rolesMock,
} from "@/features/administrators/mocks/administrators.mock"

describe("permissions", () => {
  const role = { permissions: ["members.view", "members.create"] as const }

  it("checks individual and grouped permissions", () => {
    expect(hasPermission(role, "members.view")).toBe(true)
    expect(canAny(role, ["members.delete", "members.create"])).toBe(true)
    expect(canAll(role, ["members.view", "members.create"])).toBe(true)
    expect(canAll(role, ["members.view", "members.delete"])).toBe(false)
  })
})

describe("administrator roles and scope", () => {
  it("gives the organization administrator full configured access", () => {
    expect(
      hasAdministratorPermission(
        administratorsMock[0],
        rolesMock,
        "administrators.invite",
        "branch-epe",
      ),
    ).toBe(true)
  })

  it("limits branch administrators to assigned branches", () => {
    const branchAdministrator = administratorsMock.find(
      (administrator) => administrator.id === "admin-bola",
    )!
    expect(canAccessBranch(branchAdministrator, "branch-ikeja")).toBe(true)
    expect(canAccessBranch(branchAdministrator, "branch-epe")).toBe(false)
    expect(
      hasAdministratorPermission(
        branchAdministrator,
        rolesMock,
        "groups.update",
        "branch-epe",
      ),
    ).toBe(false)
  })

  it("keeps finance and membership roles within their domains", () => {
    const finance = administratorsMock.find(
      (administrator) => administrator.id === "admin-taiwo",
    )!
    expect(
      hasAdministratorPermission(finance, rolesMock, "contributions.approve_withdrawal"),
    ).toBe(true)
    expect(
      hasAdministratorPermission(finance, rolesMock, "members.delete"),
    ).toBe(false)

    const membership = administratorsMock.find(
      (administrator) => administrator.id === "admin-kunle",
    )!
    expect(
      hasAdministratorPermission(
        membership,
        rolesMock,
        "groups.manage_members",
      ),
    ).toBe(true)
    expect(
      hasAdministratorPermission(membership, rolesMock, "loans.approve"),
    ).toBe(false)
  })
})

describe("environment capabilities", () => {
  it("locks financial operations before review", () => {
    expect(canPerform("pending_review", "workspace.configure")).toBe(true)
    expect(canPerform("pending_review", "financial_transaction")).toBe(false)
  })

  it("enables financial operations in live mode", () => {
    expect(canPerform("live", "financial_transaction")).toBe(true)
    expect(canPerform("live", "loan.disburse")).toBe(true)
  })
})
