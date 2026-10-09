import { describe, expect, it } from "vitest"
import { emptySelection, isEmptySelection, resolveRecipients } from "./recipients"
import type { GroupMembership, Member } from "@/types"

const ORGANIZATION = "org-lagos-farmers"

const member = (overrides: Partial<Member> & { id: string }): Member => ({
  name: `Member ${overrides.id}`,
  phone: "+234 800 000 0000",
  group: "Ikeja Farmers",
  branchId: "branch-ikeja",
  branchName: "Ikeja",
  status: "Active",
  accountStatus: "Created",
  joinedAt: "12 Jan 2023",
  initials: "MM",
  ...overrides,
})

const membership = (groupId: string, memberId: string, status: GroupMembership["status"] = "active"): GroupMembership => ({
  id: `${groupId}:${memberId}`,
  organizationId: ORGANIZATION,
  groupId,
  memberId,
  role: "member",
  status,
  joinedAt: "12 Jan 2023",
})

const members: Member[] = [
  member({ id: "LFC-002481", name: "Adewale Johnson" }),
  member({ id: "LFC-002479", name: "Chinedu Okafor", branchId: "branch-surulere", branchName: "Surulere" }),
  member({ id: "LFC-002462", name: "Fatima Bello", branchId: "branch-epe", branchName: "Epe" }),
  member({ id: "LFC-002438", name: "Ibrahim Musa", status: "Suspended" }),
]

const memberships: GroupMembership[] = [
  membership("group-ikeja", "LFC-002481"),
  membership("group-ikeja", "LFC-002462"),
  membership("group-exec", "LFC-002479"),
]

const base = { members, memberships }

describe("resolveRecipients", () => {
  it("returns nobody for an empty selection", () => {
    expect(resolveRecipients({ ...base, selection: emptySelection })).toEqual([])
    expect(isEmptySelection(emptySelection)).toBe(true)
  })

  it("returns everyone for All members, sorted by name", () => {
    const result = resolveRecipients({
      ...base,
      selection: { ...emptySelection, allMembers: true },
    })
    expect(result.map((r) => r.name)).toEqual([
      "Adewale Johnson",
      "Chinedu Okafor",
      "Fatima Bello",
      "Ibrahim Musa",
    ])
  })

  it("returns just the people picked individually", () => {
    const result = resolveRecipients({
      ...base,
      selection: { ...emptySelection, memberIds: ["LFC-002462"] },
    })
    expect(result.map((r) => r.memberId)).toEqual(["LFC-002462"])
  })

  it("expands a group through its active memberships only", () => {
    const result = resolveRecipients({
      ...base,
      selection: { ...emptySelection, groupIds: ["group-ikeja"] },
    })
    expect(result.map((r) => r.memberId)).toEqual(["LFC-002481", "LFC-002462"])
  })

  it("ignores an inactive membership", () => {
    const result = resolveRecipients({
      members,
      memberships: [membership("group-ikeja", "LFC-002481", "inactive")],
      selection: { ...emptySelection, groupIds: ["group-ikeja"] },
    })
    expect(result).toEqual([])
  })

  it("expands a branch", () => {
    const result = resolveRecipients({
      ...base,
      selection: { ...emptySelection, branchIds: ["branch-epe"] },
    })
    expect(result.map((r) => r.memberId)).toEqual(["LFC-002462"])
  })

  it("counts a person once when a group and a branch overlap", () => {
    // LFC-002481 is in group-ikeja and in branch-ikeja, so selecting both must not double-charge
    // them. LFC-002462 arrives through the group and LFC-002438 through the branch.
    const result = resolveRecipients({
      ...base,
      selection: {
        ...emptySelection,
        groupIds: ["group-ikeja"],
        branchIds: ["branch-ikeja"],
      },
    })
    expect(result.map((r) => r.memberId)).toEqual(["LFC-002481", "LFC-002462", "LFC-002438"])
    expect(new Set(result.map((r) => r.memberId)).size).toBe(result.length)
  })

  it("counts a person once when picked individually and through a group", () => {
    const result = resolveRecipients({
      ...base,
      selection: { ...emptySelection, memberIds: ["LFC-002481"], groupIds: ["group-ikeja"] },
    })
    expect(result.map((r) => r.memberId)).toEqual(["LFC-002481", "LFC-002462"])
  })

  it("applies the status filter to every kind of selection", () => {
    const group = resolveRecipients({
      ...base,
      selection: { ...emptySelection, allMembers: true, status: "Suspended" },
    })
    expect(group.map((r) => r.memberId)).toEqual(["LFC-002438"])

    const branched = resolveRecipients({
      ...base,
      selection: { ...emptySelection, branchIds: ["branch-ikeja"], status: "Active" },
    })
    expect(branched.map((r) => r.memberId)).toEqual(["LFC-002481"])
  })

  it("carries the contact details the send needs", () => {
    const result = resolveRecipients({
      ...base,
      selection: { ...emptySelection, memberIds: ["LFC-002481"] },
    })
    expect(result[0]).toEqual({
      memberId: "LFC-002481",
      name: "Adewale Johnson",
      phone: "+234 800 000 0000",
      email: undefined,
    })
  })

  it("treats a selection with only a status as empty", () => {
    expect(isEmptySelection({ ...emptySelection, status: "Active" })).toBe(true)
    expect(isEmptySelection({ ...emptySelection, allMembers: true })).toBe(false)
  })
})
