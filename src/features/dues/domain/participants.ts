import type { GroupMembership, Member } from "@/types"
import type { DuesParticipantSelection, DuesRosterEntry } from "../types/dues.types"
/**
 * Turns the create form's selection into the people a plan covers.
 *
 * This mirrors Communications' `resolveRecipients` — a person in two selected sources is one
 * participant, never two — but its output is a *roster entry* (member id, name, code, branch) rather
 * than a message recipient, and its scopes are the four dues scopes. Keeping it here means neither
 * feature's shape has to bend to the other's.
 */
export function resolveParticipantRoster(input: {
  members: Member[]
  /** Membership rows for the selected group, read only when a group is selected. */
  memberships?: GroupMembership[]
  selection: DuesParticipantSelection
}): DuesRosterEntry[] {
  const { members, memberships = [], selection } = input
  const inGroup = new Set(
    memberships
      .filter((membership) => membership.groupId === selection.groupId && membership.status === "active")
      .map((membership) => membership.memberId),
  )
  const pickedDirectly = new Set(selection.memberIds)
  const matches = (member: Member) => {
    if (selection.status !== "All" && member.status !== selection.status) return false
    switch (selection.scope) {
      case "All":
        return true
      case "Group":
        return inGroup.has(member.id)
      case "Branch":
        return Boolean(selection.branchId && member.branchId === selection.branchId)
      case "Selected":
        return pickedDirectly.has(member.id)
    }
  }
  return members
    .filter(matches)
    .map((member) => ({
      memberId: member.id,
      memberName: member.name,
      memberCode: member.id,
      branchId: member.branchId,
      branchName: member.branchName,
      phone: member.phone,
    }))
    .sort((a, b) => a.memberName.localeCompare(b.memberName))
}
/** True when the selection would cover nobody. */
export const isEmptyDuesSelection = (selection: DuesParticipantSelection) => {
  if (selection.scope === "All") return false
  if (selection.scope === "Group") return !selection.groupId
  if (selection.scope === "Branch") return !selection.branchId
  return selection.memberIds.length === 0
}
