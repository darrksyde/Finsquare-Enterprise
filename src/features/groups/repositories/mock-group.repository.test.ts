import { describe, expect, it } from "vitest"
import { MockGroupRepository } from "./mock-group.repository"

const organizationId = "org-lagos-farmers"

describe("MockGroupRepository", () => {
  it("creates and updates a group", async () => {
    const repository = new MockGroupRepository()
    const group = await repository.createGroup(organizationId, {
      name: "Market Access Project",
      code: "MAP-01",
      typeId: "project",
      branchId: "branch-ikeja",
      status: "active",
      allowJoinRequests: true,
      coordinatorCanManageMembers: true,
      visibility: "members",
    })
    expect(group.organizationId).toBe(organizationId)
    const updated = await repository.updateGroup(organizationId, group.id, {
      name: "Market Access Programme",
    })
    expect(updated.name).toBe("Market Access Programme")
  })

  it("assigns, updates, and removes members without restricting multi-group membership", async () => {
    const repository = new MockGroupRepository()
    const first = await repository.addGroupMember(
      organizationId,
      "group-executive",
      "LFC-002462",
    )
    await repository.addGroupMember(
      organizationId,
      "group-ikeja-savings",
      "LFC-002462",
    )
    const updated = await repository.updateGroupMemberRole(
      organizationId,
      "group-executive",
      "LFC-002462",
      "secretary",
    )
    expect(updated.role).toBe("secretary")
    await repository.removeGroupMember(
      organizationId,
      "group-executive",
      first.memberId,
    )
    expect(
      await repository.getGroupMembers(organizationId, "group-executive"),
    ).not.toContainEqual(expect.objectContaining({ memberId: "LFC-002462" }))
    expect(
      await repository.getGroupMembers(organizationId, "group-ikeja-savings"),
    ).toContainEqual(expect.objectContaining({ memberId: "LFC-002462" }))
  })

  it("changes coordinator and archives a group", async () => {
    const repository = new MockGroupRepository()
    const group = await repository.updateGroup(
      organizationId,
      "group-investment",
      { coordinatorMemberId: "LFC-002438" },
    )
    expect(group.coordinatorMemberId).toBe("LFC-002438")
    const archived = await repository.archiveGroup(organizationId, group.id)
    expect(archived.status).toBe("archived")
  })
})
