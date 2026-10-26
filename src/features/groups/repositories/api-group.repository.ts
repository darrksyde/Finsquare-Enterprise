import { apiClient, endpoints } from "@/services/api"
import { ApiError } from "@/services/api/types"
import type {
  CreateGroupInput,
  Group,
  GroupMemberRole,
  GroupMembership,
  GroupType,
  UpdateGroupInput,
} from "@/types"
import type { GroupRepository } from "./group.repository"

/**
 * API-backed group repository, wired to the MFI group endpoints. The tenant is derived from the
 * JWT, so the organization id the repository is handed is ignored.
 */
export class ApiGroupRepository implements GroupRepository {
  async getGroups(): Promise<Group[]> {
    return apiClient.get<Group[]>(endpoints.groups.list)
  }

  async getGroupTypes(): Promise<GroupType[]> {
    return apiClient.get<GroupType[]>(endpoints.groups.types)
  }

  async getGroup(_organizationId: string, id: string): Promise<Group | null> {
    try {
      return await apiClient.get<Group>(endpoints.groups.detail(id))
    } catch (error) {
      if (error instanceof ApiError && error.code === "not_found") return null
      throw error
    }
  }

  async createGroup(_organizationId: string, input: CreateGroupInput): Promise<Group> {
    return apiClient.post<Group>(endpoints.groups.list, input)
  }

  async updateGroup(
    _organizationId: string,
    id: string,
    input: UpdateGroupInput,
  ): Promise<Group> {
    return apiClient.patch<Group>(endpoints.groups.detail(id), input)
  }

  async deleteGroup(_organizationId: string, id: string): Promise<void> {
    await apiClient.delete(endpoints.groups.detail(id))
  }

  async archiveGroup(_organizationId: string, id: string): Promise<Group> {
    return apiClient.post<Group>(endpoints.groups.archive(id))
  }

  async activateGroup(_organizationId: string, id: string): Promise<Group> {
    return apiClient.post<Group>(endpoints.groups.activate(id))
  }

  async getGroupMembers(_organizationId: string, groupId: string): Promise<GroupMembership[]> {
    return apiClient.get<GroupMembership[]>(endpoints.groups.members(groupId))
  }

  async addGroupMember(
    _organizationId: string,
    groupId: string,
    memberId: string,
    role: GroupMemberRole = "member",
  ): Promise<GroupMembership> {
    return apiClient.post<GroupMembership>(endpoints.groups.members(groupId), { memberId, role })
  }

  async removeGroupMember(
    _organizationId: string,
    groupId: string,
    memberId: string,
  ): Promise<void> {
    await apiClient.delete(endpoints.groups.member(groupId, memberId))
  }

  async updateGroupMemberRole(
    _organizationId: string,
    groupId: string,
    memberId: string,
    role: GroupMemberRole,
  ): Promise<GroupMembership> {
    return apiClient.patch<GroupMembership>(endpoints.groups.member(groupId, memberId), { role })
  }
}
