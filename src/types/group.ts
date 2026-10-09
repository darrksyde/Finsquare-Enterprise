import type { EntityId } from "./common"

export const GROUP_STATUSES = ["active", "inactive", "archived"] as const
export type GroupStatus = typeof GROUP_STATUSES[number]

export interface GroupType {
  id: EntityId
  organizationId: EntityId
  name: string
  description?: string
  isSystem: boolean
}

export const GROUP_MEMBER_ROLES = [
  "member",
  "coordinator",
  "assistant_coordinator",
  "secretary",
  "treasurer",
] as const
export type GroupMemberRole = typeof GROUP_MEMBER_ROLES[number]

export interface Group {
  id: EntityId
  organizationId: EntityId
  name: string
  code?: string
  description?: string
  typeId: EntityId
  branchId?: EntityId | null
  parentGroupId?: EntityId | null
  coordinatorMemberId?: EntityId | null
  assistantCoordinatorMemberId?: EntityId | null
  status: GroupStatus
  memberCount: number
  allowJoinRequests: boolean
  coordinatorCanManageMembers: boolean
  visibility: "organization" | "members"
  createdAt: string
  updatedAt: string
}

export interface GroupMembership {
  id: EntityId
  organizationId: EntityId
  groupId: EntityId
  memberId: EntityId
  role: GroupMemberRole
  status: "active" | "inactive"
  joinedAt: string
  leftAt?: string | null
}

export interface CreateGroupInput {
  name: string
  code?: string
  description?: string
  typeId: EntityId
  branchId?: EntityId | null
  parentGroupId?: EntityId | null
  coordinatorMemberId?: EntityId | null
  assistantCoordinatorMemberId?: EntityId | null
  status: GroupStatus
  allowJoinRequests: boolean
  coordinatorCanManageMembers: boolean
  visibility: Group["visibility"]
}

export type UpdateGroupInput = Partial<CreateGroupInput>
