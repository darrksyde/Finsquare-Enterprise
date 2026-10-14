import { env } from "@/app/config/env"
import { ApiCommunityRepository } from "../repositories/api-community.repository"
import { MockCommunityRepository } from "../repositories/mock-community.repository"
import type { CommunityRepository } from "../repositories/community.repository"
import type { CommunityMembership, CreateCommunityInput } from "../types"

const repository: CommunityRepository = env.VITE_ENABLE_MOCKS
  ? new MockCommunityRepository()
  : new ApiCommunityRepository()

export const communitiesService = {
  /** The communities the signed-in administrator belongs to. */
  list(): Promise<CommunityMembership[]> {
    return repository.list()
  },

  /** Starts a community. The caller becomes its owner and holds its Super Admin role. */
  create(input: CreateCommunityInput): Promise<CommunityMembership> {
    return repository.create(input)
  },
}
