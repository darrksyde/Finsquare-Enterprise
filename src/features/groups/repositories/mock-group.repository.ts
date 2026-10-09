import { membersMock } from "@/features/members/mocks/members.mock"
import type {
  CreateGroupInput,
  Group,
  GroupMemberRole,
  GroupMembership,
  UpdateGroupInput,
} from "@/types"
import { groupMembershipsMock, groupsMock } from "../mocks/groups.mock"
import type { GroupRepository } from "./group.repository"

export class MockGroupRepository implements GroupRepository {
  private groups = structuredClone(groupsMock)
  private memberships = structuredClone(groupMembershipsMock)

  async getGroups(organizationId: string) {
    return structuredClone(
      this.groups.filter((group) => group.organizationId === organizationId),
    )
  }

  async getGroup(organizationId: string, id: string) {
    return structuredClone(
      this.groups.find(
        (group) => group.organizationId === organizationId && group.id === id,
      ) ?? null,
    )
  }

  async createGroup(organizationId: string, input: CreateGroupInput) {
    this.assertUniqueCode(organizationId, input.code)
    this.assertCoordinator(input.coordinatorMemberId)
    this.assertCoordinator(input.assistantCoordinatorMemberId)
    const now = new Date().toISOString()
    const group: Group = {
      ...input,
      id: `group-${crypto.randomUUID()}`,
      organizationId,
      memberCount: 0,
      createdAt: now,
      updatedAt: now,
    }
    this.groups.unshift(group)
    if (input.coordinatorMemberId) {
      await this.addGroupMember(
        organizationId,
        group.id,
        input.coordinatorMemberId,
        "coordinator",
      )
    }
    if (input.assistantCoordinatorMemberId) {
      await this.addGroupMember(
        organizationId,
        group.id,
        input.assistantCoordinatorMemberId,
        "assistant_coordinator",
      )
    }
    return structuredClone(group)
  }

  async updateGroup(
    organizationId: string,
    id: string,
    input: UpdateGroupInput,
  ) {
    const group = this.requireGroup(organizationId, id)
    if (input.code !== undefined && input.code !== group.code) {
      this.assertUniqueCode(organizationId, input.code)
    }
    this.assertCoordinator(input.coordinatorMemberId)
    this.assertCoordinator(input.assistantCoordinatorMemberId)
    Object.assign(group, input, { updatedAt: new Date().toISOString() })
    if (input.coordinatorMemberId) {
      await this.addGroupMember(
        organizationId,
        id,
        input.coordinatorMemberId,
        "coordinator",
      )
    }
    if (input.assistantCoordinatorMemberId) {
      await this.addGroupMember(
        organizationId,
        id,
        input.assistantCoordinatorMemberId,
        "assistant_coordinator",
      )
    }
    return structuredClone(group)
  }

  async deleteGroup(organizationId: string, id: string) {
    this.requireGroup(organizationId, id)
    if (this.memberships.some((membership) => membership.groupId === id)) {
      throw new Error(
        "This group has membership history and should be archived instead.",
      )
    }
    this.groups = this.groups.filter((group) => group.id !== id)
  }

  async archiveGroup(organizationId: string, id: string) {
    return this.updateGroup(organizationId, id, { status: "archived" })
  }

  async activateGroup(organizationId: string, id: string) {
    return this.updateGroup(organizationId, id, { status: "active" })
  }

  async getGroupMembers(organizationId: string, groupId: string) {
    this.requireGroup(organizationId, groupId)
    return structuredClone(
      this.memberships.filter(
        (membership) =>
          membership.organizationId === organizationId &&
          membership.groupId === groupId &&
          membership.status === "active",
      ),
    )
  }

  async addGroupMember(
    organizationId: string,
    groupId: string,
    memberId: string,
    role: GroupMemberRole = "member",
  ) {
    const group = this.requireGroup(organizationId, groupId)
    if (!membersMock.some((member) => member.id === memberId)) {
      throw new Error(
        "The selected member does not belong to this organization.",
      )
    }
    const existing = this.memberships.find(
      (membership) =>
        membership.groupId === groupId && membership.memberId === memberId,
    )
    if (existing) {
      existing.status = "active"
      existing.role = role
      existing.leftAt = null
      return structuredClone(existing)
    }
    const membership: GroupMembership = {
      id: `membership-${crypto.randomUUID()}`,
      organizationId,
      groupId,
      memberId,
      role,
      status: "active",
      joinedAt: new Date().toISOString(),
    }
    this.memberships.push(membership)
    group.memberCount += 1
    return structuredClone(membership)
  }

  async removeGroupMember(
    organizationId: string,
    groupId: string,
    memberId: string,
  ) {
    const group = this.requireGroup(organizationId, groupId)
    const membership = this.memberships.find(
      (item) =>
        item.organizationId === organizationId &&
        item.groupId === groupId &&
        item.memberId === memberId &&
        item.status === "active",
    )
    if (!membership) return
    membership.status = "inactive"
    membership.leftAt = new Date().toISOString()
    if (group.coordinatorMemberId === memberId) {
      group.coordinatorMemberId = null
    }
    if (group.assistantCoordinatorMemberId === memberId) {
      group.assistantCoordinatorMemberId = null
    }
    group.memberCount = Math.max(0, group.memberCount - 1)
  }

  async updateGroupMemberRole(
    organizationId: string,
    groupId: string,
    memberId: string,
    role: GroupMemberRole,
  ) {
    const group = this.requireGroup(organizationId, groupId)
    const membership = this.memberships.find(
      (item) =>
        item.organizationId === organizationId &&
        item.groupId === groupId &&
        item.memberId === memberId &&
        item.status === "active",
    )
    if (!membership) throw new Error("Group membership not found.")
    if (role === "coordinator") {
      this.memberships
        .filter(
          (item) =>
            item.groupId === groupId &&
            item.status === "active" &&
            item.role === "coordinator",
        )
        .forEach((item) => {
          item.role = "member"
        })
      group.coordinatorMemberId = memberId
    } else if (group.coordinatorMemberId === memberId) {
      group.coordinatorMemberId = null
    }
    if (role === "assistant_coordinator") {
      group.assistantCoordinatorMemberId = memberId
    } else if (group.assistantCoordinatorMemberId === memberId) {
      group.assistantCoordinatorMemberId = null
    }
    membership.role = role
    return structuredClone(membership)
  }

  private requireGroup(organizationId: string, id: string) {
    const group = this.groups.find(
      (item) => item.organizationId === organizationId && item.id === id,
    )
    if (!group) throw new Error("Group not found.")
    return group
  }

  private assertUniqueCode(organizationId: string, code?: string) {
    if (
      code &&
      this.groups.some(
        (group) =>
          group.organizationId === organizationId &&
          group.code?.toLowerCase() === code.toLowerCase(),
      )
    ) {
      throw new Error("A group with this code already exists.")
    }
  }

  private assertCoordinator(memberId?: string | null) {
    if (memberId && !membersMock.some((member) => member.id === memberId)) {
      throw new Error("A coordinator must be an organization member.")
    }
  }
}
