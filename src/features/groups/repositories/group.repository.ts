import type {
  CreateGroupInput,
  Group,
  GroupMemberRole,
  GroupMembership,
  UpdateGroupInput,
} from "@/types"

export interface GroupRepository {
  getGroups(organizationId: string): Promise<Group[]>
  getGroup(organizationId: string, id: string): Promise<Group | null>
  createGroup(organizationId: string, input: CreateGroupInput): Promise<Group>
  updateGroup(
    organizationId: string,
    id: string,
    input: UpdateGroupInput,
  ): Promise<Group>
  deleteGroup(organizationId: string, id: string): Promise<void>
  archiveGroup(organizationId: string, id: string): Promise<Group>
  activateGroup(organizationId: string, id: string): Promise<Group>
  getGroupMembers(
    organizationId: string,
    groupId: string,
  ): Promise<GroupMembership[]>
  addGroupMember(
    organizationId: string,
    groupId: string,
    memberId: string,
    role?: GroupMemberRole,
  ): Promise<GroupMembership>
  removeGroupMember(
    organizationId: string,
    groupId: string,
    memberId: string,
  ): Promise<void>
  updateGroupMemberRole(
    organizationId: string,
    groupId: string,
    memberId: string,
    role: GroupMemberRole,
  ): Promise<GroupMembership>
}
