import { MockGroupRepository } from "../repositories/mock-group.repository"
import type { GroupRepository } from "../repositories/group.repository"

export const groupsService: GroupRepository = new MockGroupRepository()
