import { useCallback } from "react"
import { useAsyncResource } from "@/hooks/useAsyncResource"
import type {
  CreateGroupInput,
  GroupMemberRole,
  UpdateGroupInput,
} from "@/types"
import { groupsService } from "../services/groups.service"

export function useGroups(organizationId: string) {
  const resource = useAsyncResource(
    () => groupsService.getGroups(organizationId),
    [organizationId],
  )
  const typesResource = useAsyncResource(
    () => groupsService.getGroupTypes(organizationId),
    [organizationId],
  )

  const createGroup = useCallback(
    async (input: CreateGroupInput) => {
      const group = await groupsService.createGroup(organizationId, input)
      resource.refresh()
      return group
    },
    [organizationId, resource],
  )

  const updateGroup = useCallback(
    async (id: string, input: UpdateGroupInput) => {
      const group = await groupsService.updateGroup(organizationId, id, input)
      resource.refresh()
      return group
    },
    [organizationId, resource],
  )

  const archiveGroup = useCallback(
    async (id: string) => {
      await groupsService.archiveGroup(organizationId, id)
      resource.refresh()
    },
    [organizationId, resource],
  )

  const activateGroup = useCallback(
    async (id: string) => {
      await groupsService.activateGroup(organizationId, id)
      resource.refresh()
    },
    [organizationId, resource],
  )

  return {
    ...resource,
    groups: resource.data ?? [],
    groupTypes: typesResource.data ?? [],
    createGroup,
    updateGroup,
    archiveGroup,
    activateGroup,
  }
}

export function useGroup(organizationId: string, groupId: string) {
  const groupResource = useAsyncResource(
    () => groupsService.getGroup(organizationId, groupId),
    [organizationId, groupId],
  )
  const membershipResource = useAsyncResource(
    () => groupsService.getGroupMembers(organizationId, groupId),
    [organizationId, groupId],
  )

  const addMember = async (
    memberId: string,
    role: GroupMemberRole = "member",
  ) => {
    await groupsService.addGroupMember(organizationId, groupId, memberId, role)
    membershipResource.refresh()
    groupResource.refresh()
  }

  const removeMember = async (memberId: string) => {
    await groupsService.removeGroupMember(organizationId, groupId, memberId)
    membershipResource.refresh()
    groupResource.refresh()
  }

  const updateMemberRole = async (memberId: string, role: GroupMemberRole) => {
    await groupsService.updateGroupMemberRole(
      organizationId,
      groupId,
      memberId,
      role,
    )
    membershipResource.refresh()
  }

  const updateGroup = async (input: UpdateGroupInput) => {
    await groupsService.updateGroup(organizationId, groupId, input)
    groupResource.refresh()
    membershipResource.refresh()
  }

  return {
    group: groupResource.data,
    memberships: membershipResource.data ?? [],
    status:
      groupResource.status === "error" || membershipResource.status === "error"
        ? "error"
        : groupResource.status === "loading" ||
            membershipResource.status === "loading"
          ? "loading"
          : "success",
    error: groupResource.error ?? membershipResource.error,
    retry: () => {
      groupResource.retry()
      membershipResource.retry()
    },
    addMember,
    removeMember,
    updateMemberRole,
    updateGroup,
  }
}
