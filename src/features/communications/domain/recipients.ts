import type { GroupMembership, Member, MemberStatus } from "@/types"
import type { ResolvedRecipient } from "../types/message.types"

/**
 * Who the administrator has picked. Groups and branches are *selections*, not filters: picking
 * "Ikeja Farmers" and "Ikeja branch" means everyone in either, counted once.
 */
export interface RecipientSelection {
  allMembers: boolean
  memberIds: string[]
  groupIds: string[]
  branchIds: string[]
  /** `"All"` leaves the member registry unfiltered. */
  status: MemberStatus | "All"
}

export const emptySelection: RecipientSelection = {
  allMembers: false,
  memberIds: [],
  groupIds: [],
  branchIds: [],
  status: "All",
}

/**
 * Turns a selection into the people who will actually receive the message.
 *
 * De-duplication is the point of this function: a member belongs to groups and to a branch, so
 * "Group A + Branch B" would otherwise text the same person twice — and charge for it twice.
 * The result is sorted by name so the count and the confirmation list read the same every time.
 */
export function resolveRecipients(input: {
  members: Member[]
  memberships: GroupMembership[]
  selection: RecipientSelection
}): ResolvedRecipient[] {
  const { members, memberships, selection } = input

  const inGroups = new Set(
    memberships
      .filter(
        (membership) =>
          selection.groupIds.includes(membership.groupId) && membership.status === "active",
      )
      .map((membership) => membership.memberId),
  )
  const inBranches = new Set(selection.branchIds)
  const pickedDirectly = new Set(selection.memberIds)

  const matches = (member: Member) => {
    if (selection.status !== "All" && member.status !== selection.status) return false
    if (selection.allMembers) return true
    if (pickedDirectly.has(member.id)) return true
    if (inGroups.has(member.id)) return true
    return Boolean(member.branchId && inBranches.has(member.branchId))
  }

  return members
    .filter(matches)
    .map((member) => ({
      memberId: member.id,
      name: member.name,
      phone: member.phone,
      email: member.email,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** True when the selection would send to nobody. */
export const isEmptySelection = (selection: RecipientSelection) =>
  !selection.allMembers &&
  selection.memberIds.length === 0 &&
  selection.groupIds.length === 0 &&
  selection.branchIds.length === 0
