import { env } from "@/app/config/env"
import { ApiBranchRepository } from "../repositories/api-branch.repository"
import { MockBranchRepository } from "../repositories/mock-branch.repository"
import type { BranchRepository } from "../repositories/branch.repository"

export const branchesService: BranchRepository = env.VITE_ENABLE_MOCKS
  ? new MockBranchRepository()
  : new ApiBranchRepository()
