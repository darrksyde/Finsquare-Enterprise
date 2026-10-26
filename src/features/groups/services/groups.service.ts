import { env } from "@/app/config/env"
import { ApiGroupRepository } from "../repositories/api-group.repository"
import { MockGroupRepository } from "../repositories/mock-group.repository"
import type { GroupRepository } from "../repositories/group.repository"

export const groupsService: GroupRepository = env.VITE_ENABLE_MOCKS
  ? new MockGroupRepository()
  : new ApiGroupRepository()
