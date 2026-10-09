import { describe, expect, it } from "vitest"
import { isEmptyDuesSelection, resolveParticipantRoster } from "./participants"
import type { GroupMembership, Member } from "@/types"
import type { DuesParticipantSelection } from "../types/dues.types"
function member(overrides: Partial<Member> & Pick<Member, "id" | "name">): Member {
  return {
    phone: "+234 800 000 0000",
    group: "Ikeja Farmers",
    status: "Active",
    accountStatus: "Created",
    joinedAt: "2026-01-01",
    initials: overrides.name.slice(0, 2).toUpperCase(),
    branchId: "branch-ikeja",
    branchName: "Ikeja",
    ...overrides,
  }
}
const members: Member[] = [
  member({ id: "m1", name: "Adewale Johnson" }),
  member({
    id: "m2",
    name: "Bisi Adebayo",
    branchId: "branch-epe",
    branchName: "Epe",
    status: "Inactive",
  }),
  member({
    id: "m3",
    name: "Chinedu Okafor",
    branchId: "branch-epe",
    branchName: "Epe",
    status: "Suspended",
  }),
]
const selection = (overrides: Partial<DuesParticipantSelection> = {}): DuesParticipantSelection => ({
  scope: "All",
  memberIds: [],
  status: "All",
  ...overrides,
})
const membership = (memberId: string, status: GroupMembership["status"] = "active"): GroupMembership => ({
  id: `gm-${memberId}`,
  organizationId: "org-test",
  groupId: "group-1",
  memberId,
  role: "member",
  status,
  joinedAt: "2026-01-01",
})
describe("resolveParticipantRoster", () => {
  it("covers every member when the scope is All", () => {
    const roster = resolveParticipantRoster({ members, selection: selection() })
    expect(roster.map((entry) => entry.memberId)).toEqual(["m1", "m2", "m3"])
    // Sorted by name so the roster and its count read the same every time.
    expect(roster.map((entry) => entry.memberName)).toEqual(["Adewale Johnson", "Bisi Adebayo", "Chinedu Okafor"])
  })
  it("covers only the picked members when the scope is Selected", () => {
    const roster = resolveParticipantRoster({
      members,
      selection: selection({ scope: "Selected", memberIds: ["m3", "m1"] }),
    })
    expect(roster.map((entry) => entry.memberId)).toEqual(["m1", "m3"])
  })
  it("resolves a group through its active membership rows", () => {
    const memberships = [membership("m1"), membership("m2", "inactive"), membership("m1")]
    const roster = resolveParticipantRoster({
      members,
      memberships,
      selection: selection({ scope: "Group", groupId: "group-1" }),
    })
    // m2 left the group; m1 appears once even though the rows repeat.
    expect(roster.map((entry) => entry.memberId)).toEqual(["m1"])
  })
  it("resolves a branch from the members who belong to it", () => {
    const roster = resolveParticipantRoster({
      members,
      selection: selection({ scope: "Branch", branchId: "branch-epe" }),
    })
    expect(roster.map((entry) => entry.memberId)).toEqual(["m2", "m3"])
  })
  it("applies the member-status filter to every scope", () => {
    expect(
      resolveParticipantRoster({
        members,
        selection: selection({ status: "Active" }),
      }).map((e) => e.memberId),
    ).toEqual(["m1"])
    expect(
      resolveParticipantRoster({
        members,
        selection: selection({
          scope: "Branch",
          branchId: "branch-epe",
          status: "Suspended",
        }),
      }).map((e) => e.memberId),
    ).toEqual(["m3"])
  })
  it("carries the branch so a participant row can name it", () => {
    const entry = resolveParticipantRoster({
      members,
      selection: selection({ scope: "Selected", memberIds: ["m2"] }),
    })[0]
    expect(entry).toMatchObject({
      memberId: "m2",
      branchId: "branch-epe",
      branchName: "Epe",
      memberCode: "m2",
    })
  })
  it("returns nobody for a scope that has not been filled in yet", () => {
    expect(
      resolveParticipantRoster({
        members,
        selection: selection({ scope: "Group" }),
      }),
    ).toHaveLength(0)
    expect(
      resolveParticipantRoster({
        members,
        selection: selection({ scope: "Branch" }),
      }),
    ).toHaveLength(0)
    expect(
      resolveParticipantRoster({
        members,
        selection: selection({ scope: "Selected" }),
      }),
    ).toHaveLength(0)
  })
})
describe("isEmptyDuesSelection", () => {
  it("knows when a selection would cover nobody", () => {
    expect(isEmptyDuesSelection(selection())).toBe(false)
    expect(isEmptyDuesSelection(selection({ scope: "Selected" }))).toBe(true)
    expect(isEmptyDuesSelection(selection({ scope: "Selected", memberIds: ["m1"] }))).toBe(false)
    expect(isEmptyDuesSelection(selection({ scope: "Group" }))).toBe(true)
    expect(isEmptyDuesSelection(selection({ scope: "Group", groupId: "group-1" }))).toBe(false)
    expect(isEmptyDuesSelection(selection({ scope: "Branch" }))).toBe(true)
    expect(isEmptyDuesSelection(selection({ scope: "Branch", branchId: "branch-epe" }))).toBe(false)
  })
})
