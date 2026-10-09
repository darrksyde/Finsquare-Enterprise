import type { CreateGroupInput, Group } from "@/types"

export interface GroupDTO {
  id: string
  organization_id: string
  name: string
  code?: string
  description?: string
  type_id: string
  branch_id?: string | null
  parent_group_id?: string | null
  coordinator_member_id?: string | null
  assistant_coordinator_member_id?: string | null
  status: Group["status"]
  member_count: number
  allow_join_requests: boolean
  coordinator_can_manage_members: boolean
  visibility: Group["visibility"]
  created_at: string
  updated_at: string
}

export function mapApiGroupToGroup(dto: GroupDTO): Group {
  return {
    id: dto.id,
    organizationId: dto.organization_id,
    name: dto.name,
    code: dto.code,
    description: dto.description,
    typeId: dto.type_id,
    branchId: dto.branch_id,
    parentGroupId: dto.parent_group_id,
    coordinatorMemberId: dto.coordinator_member_id,
    assistantCoordinatorMemberId: dto.assistant_coordinator_member_id,
    status: dto.status,
    memberCount: dto.member_count,
    allowJoinRequests: dto.allow_join_requests,
    coordinatorCanManageMembers: dto.coordinator_can_manage_members,
    visibility: dto.visibility,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  }
}

export function mapGroupToCreateRequest(input: CreateGroupInput) {
  return {
    name: input.name,
    code: input.code,
    description: input.description,
    type_id: input.typeId,
    branch_id: input.branchId,
    parent_group_id: input.parentGroupId,
    coordinator_member_id: input.coordinatorMemberId,
    assistant_coordinator_member_id: input.assistantCoordinatorMemberId,
    status: input.status,
    allow_join_requests: input.allowJoinRequests,
    coordinator_can_manage_members: input.coordinatorCanManageMembers,
    visibility: input.visibility,
  }
}
