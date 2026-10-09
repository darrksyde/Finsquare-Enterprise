import { administratorsMock } from "@/features/administrators/mocks/administrators.mock"
import { groupsMock } from "@/features/groups/mocks/groups.mock"
import { membersMock } from "@/features/members/mocks/members.mock"
import type { Branch, CreateBranchInput, UpdateBranchInput } from "@/types"
import { wouldCreateBranchCycle } from "../schemas/branch.schema"
import { branchesMock } from "../mocks/branches.mock"
import type { BranchRepository } from "./branch.repository"

export class MockBranchRepository implements BranchRepository {
  private branches = structuredClone(branchesMock)
  private branchAdministratorIds = new Map<string, string[]>(
    administratorsMock
      .flatMap((administrator) =>
        (administrator.accessScope.branchIds ?? []).map(
          (branchId) => [branchId, administrator.id] as const,
        ),
      )
      .reduce((map, [branchId, administratorId]) => {
        map.set(branchId, [...(map.get(branchId) ?? []), administratorId])
        return map
      }, new Map<string, string[]>()),
  )

  async getBranches(organizationId: string) {
    return structuredClone(
      this.branches.filter(
        (branch) => branch.organizationId === organizationId,
      ),
    )
  }

  async getBranch(organizationId: string, id: string) {
    return structuredClone(
      this.branches.find(
        (branch) =>
          branch.organizationId === organizationId && branch.id === id,
      ) ?? null,
    )
  }

  async createBranch(organizationId: string, input: CreateBranchInput) {
    this.assertUniqueCode(organizationId, input.code)
    if (
      input.parentBranchId &&
      !this.branches.some(
        (branch) =>
          branch.organizationId === organizationId &&
          branch.id === input.parentBranchId,
      )
    ) {
      throw new Error("Parent branch not found.")
    }
    const now = new Date().toISOString()
    const branch: Branch = {
      ...input,
      id: `branch-${crypto.randomUUID()}`,
      organizationId,
      memberCount: 0,
      groupCount: 0,
      administratorCount: input.administratorIds?.length ?? 0,
      createdAt: now,
      updatedAt: now,
    }
    this.branches.unshift(branch)
    this.branchAdministratorIds.set(branch.id, input.administratorIds ?? [])
    return structuredClone(branch)
  }

  async updateBranch(
    organizationId: string,
    id: string,
    input: UpdateBranchInput,
  ) {
    const branch = this.requireBranch(organizationId, id)
    if (
      input.parentBranchId !== undefined &&
      wouldCreateBranchCycle(id, input.parentBranchId, this.branches)
    ) {
      throw new Error(
        "This parent would create a circular branch relationship.",
      )
    }
    if (input.code !== undefined && input.code !== branch.code) {
      this.assertUniqueCode(organizationId, input.code)
    }
    Object.assign(branch, input, { updatedAt: new Date().toISOString() })
    if (input.administratorIds) {
      this.branchAdministratorIds.set(id, input.administratorIds)
      branch.administratorCount = input.administratorIds.length
    }
    return structuredClone(branch)
  }

  async deleteBranch(organizationId: string, id: string) {
    const branch = this.requireBranch(organizationId, id)
    if (
      branch.memberCount > 0 ||
      branch.groupCount > 0 ||
      this.branches.some((item) => item.parentBranchId === id)
    ) {
      throw new Error(
        "This branch contains records or child branches and should be archived.",
      )
    }
    this.branches = this.branches.filter((item) => item.id !== id)
  }

  async archiveBranch(organizationId: string, id: string) {
    return this.updateBranch(organizationId, id, { status: "archived" })
  }

  async activateBranch(organizationId: string, id: string) {
    return this.updateBranch(organizationId, id, { status: "active" })
  }

  async getBranchMembers(organizationId: string, id: string) {
    this.requireBranch(organizationId, id)
    return structuredClone(
      membersMock.filter((member) => member.branchId === id),
    )
  }

  async getBranchGroups(organizationId: string, id: string) {
    this.requireBranch(organizationId, id)
    return structuredClone(groupsMock.filter((group) => group.branchId === id))
  }

  async getBranchAdministrators(organizationId: string, id: string) {
    this.requireBranch(organizationId, id)
    return structuredClone(
      administratorsMock.filter((administrator) =>
        this.branchAdministratorIds.get(id)?.includes(administrator.id),
      ),
    )
  }

  private requireBranch(organizationId: string, id: string) {
    const branch = this.branches.find(
      (item) => item.organizationId === organizationId && item.id === id,
    )
    if (!branch) throw new Error("Branch not found.")
    return branch
  }

  private assertUniqueCode(organizationId: string, code?: string) {
    if (
      code &&
      this.branches.some(
        (branch) =>
          branch.organizationId === organizationId &&
          branch.code?.toLowerCase() === code.toLowerCase(),
      )
    ) {
      throw new Error("A branch with this code already exists.")
    }
  }
}
