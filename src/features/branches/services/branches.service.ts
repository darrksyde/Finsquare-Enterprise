import { MockBranchRepository } from "../repositories/mock-branch.repository"
import type { BranchRepository } from "../repositories/branch.repository"

export const branchesService: BranchRepository = new MockBranchRepository()
