import { useEffect, useMemo, useState } from "react"
import { groupsService } from "@/features/groups/services/groups.service"
import { useBranches } from "@/features/branches/hooks/useBranches"
import { useGroups } from "@/features/groups/hooks/useGroups"
import { useMembers } from "@/features/members/hooks/useMembers"
import { useOrganizationId } from "@/hooks/useOrganizationId"
import { resolveParticipantRoster } from "../domain/participants"
import type { DuesParticipantSelection, DuesRosterEntry } from "../types/dues.types"
import type { GroupMembership } from "@/types"
/**
 * The membership rows of the one group the administrator selected.
 *
 * Membership is read at selection time, not up front, so opening the create form does not read a
 * row per group in the organization. The backend will do this in a single call.
 */
function useGroupMembershipRows(groupId?: string): GroupMembership[] {
  const organizationId = useOrganizationId()
  const [memberships, setMemberships] = useState<GroupMembership[]>([])
  useEffect(() => {
    let active = true
    const load: Promise<GroupMembership[]> = groupId
      ? groupsService.getGroupMembers(organizationId, groupId)
      : Promise.resolve([])
    load.then((rows) => active && setMemberships(rows)).catch(() => active && setMemberships([]))
    return () => {
      active = false
    }
  }, [organizationId, groupId])
  return memberships
}
/**
 * Resolves a plan's audience to the people it covers: every member, a picked set, a group's active
 * members, or a branch's members. The roster is what the plan is created with, so the create form
 * shows the resulting count before saving.
 */
export function useParticipantRoster(selection: DuesParticipantSelection) {
  const organizationId = useOrganizationId()
  const members = useMembers(organizationId)
  const groups = useGroups(organizationId)
  const branches = useBranches(organizationId)
  const memberships = useGroupMembershipRows(selection.groupId)
  const key = [
    selection.scope,
    selection.status,
    selection.groupId ?? "",
    selection.branchId ?? "",
    [...selection.memberIds].sort().join(","),
  ].join("|")
  const roster = useMemo<DuesRosterEntry[]>(
    () =>
      resolveParticipantRoster({
        members: members.members,
        memberships,
        selection,
      }),
    // `key` is the selection's value; the object identity changes on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [members.members, memberships, key],
  )
  const selectedGroup = groups.groups.find((group) => group.id === selection.groupId)
  const selectedBranch = branches.branches.find((branch) => branch.id === selection.branchId)
  return {
    roster,
    members: members.members,
    groups: groups.groups,
    branches: branches.branches,
    memberships,
    groupName: selectedGroup?.name,
    branchName: selectedBranch?.name,
    status:
      members.status === "error" || groups.status === "error" || branches.status === "error" ? "error" : members.status,
    error: members.error ?? groups.error ?? branches.error,
    retry: () => {
      members.retry()
      groups.retry()
      branches.retry()
    },
  }
}
