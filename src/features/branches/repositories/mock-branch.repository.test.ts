import { describe, expect, it } from "vitest"
import { MockBranchRepository } from "./mock-branch.repository"
import { branchesMock } from "../mocks/branches.mock"
import { wouldCreateBranchCycle } from "../schemas/branch.schema"

const organizationId = "org-lagos-farmers"

describe("branch hierarchy", () => {
  it("detects self and descendant parent relationships", () => {
    expect(
      wouldCreateBranchCycle("branch-lagos", "branch-lagos", branchesMock),
    ).toBe(true)
    expect(
      wouldCreateBranchCycle("branch-lagos", "branch-ikeja", branchesMock),
    ).toBe(true)
    expect(
      wouldCreateBranchCycle("branch-ogun", "branch-lagos", branchesMock),
    ).toBe(false)
  })
})

describe("MockBranchRepository", () => {
  it("creates, updates, and archives a branch", async () => {
    const repository = new MockBranchRepository()
    const branch = await repository.createBranch(organizationId, {
      name: "Yaba Unit",
      code: "YAB",
      parentBranchId: "branch-lagos",
      status: "active",
    })
    expect(branch.parentBranchId).toBe("branch-lagos")
    const updated = await repository.updateBranch(organizationId, branch.id, {
      name: "Yaba Operations Unit",
    })
    expect(updated.name).toBe("Yaba Operations Unit")
    expect(
      (await repository.archiveBranch(organizationId, branch.id)).status,
    ).toBe("archived")
  })

  it("prevents circular hierarchy updates", async () => {
    const repository = new MockBranchRepository()
    await expect(
      repository.updateBranch(organizationId, "branch-lagos", {
        parentBranchId: "branch-ikeja",
      }),
    ).rejects.toThrow("circular")
  })
})
