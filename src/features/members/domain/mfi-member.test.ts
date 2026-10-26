import { describe, expect, it } from "vitest"
import {
  genderToMember,
  genderToMfi,
  mapCustomerFields,
  splitFullName,
} from "./mfi-member"

describe("mfi member mapper", () => {
  it("maps a list item onto the member domain", () => {
    const member = mapCustomerFields({
      id: "user-1",
      fullName: "Ada Okoye",
      phoneNumber: "+2348012345678",
      email: "ada@example.com",
      walletTier: "TIER_1",
      joinedAt: "2024-05-15T10:00:00.000Z",
    })

    expect(member.id).toBe("user-1")
    expect(member.name).toBe("Ada Okoye")
    expect(member.initials).toBe("AO")
    expect(member.phone).toBe("+2348012345678")
    expect(member.email).toBe("ada@example.com")
    expect(member.status).toBe("Active")
    expect(member.accountStatus).toBe("Created")
    expect(member.group).toBe("Unassigned")
    expect(member.branchName).toBeUndefined()
    expect(member.joinedAt).toBe("15 May 2024")
  })

  it("derives account and member status from the backend flags", () => {
    expect(mapCustomerFields({ id: "u", isBanned: true }).status).toBe("Suspended")
    expect(mapCustomerFields({ id: "u", isBanned: false }).status).toBe("Active")
    expect(mapCustomerFields({ id: "u" }).accountStatus).toBe("Not created")
    expect(mapCustomerFields({ id: "u", walletTier: "TIER_1" }).accountStatus).toBe("Created")
    expect(
      mapCustomerFields({ id: "u", walletTier: "TIER_1", virtualAccountNumber: "9000000001" }).accountStatus,
    ).toBe("Activated")
  })

  it("normalises the backend gender strings", () => {
    expect(genderToMember("FEMALE")).toBe("Female")
    expect(genderToMember("male")).toBe("Male")
    expect(genderToMember("OTHER")).toBe("Other")
    expect(genderToMember("Prefer not to say")).toBe("Prefer not to say")
    expect(genderToMember("Mx")).toBeUndefined()
    expect(genderToMember(undefined)).toBeUndefined()

    expect(genderToMfi("Female")).toBe("FEMALE")
    expect(genderToMfi("Male")).toBe("MALE")
    expect(genderToMfi("Other")).toBe("OTHER")
    expect(genderToMfi("Prefer not to say")).toBeUndefined()
  })

  it("splits a full name into first and last names", () => {
    expect(splitFullName("Ada Okoye")).toEqual({ firstName: "Ada", lastName: "Okoye" })
    expect(splitFullName("  Ada   Ngozi   Okoye  ")).toEqual({ firstName: "Ada", lastName: "Ngozi Okoye" })
    expect(splitFullName("Ada")).toEqual({ firstName: "Ada", lastName: "" })
  })

  it("carries group and branch placement from mfiMeta", () => {
    const member = mapCustomerFields({
      id: "u",
      fullName: "Ada Okoye",
      mfiMeta: { groupName: "Farmers Group A", branchName: "Ikeja", branchId: "branch-1" },
    })

    expect(member.group).toBe("Farmers Group A")
    expect(member.branchName).toBe("Ikeja")
    expect(member.branchId).toBe("branch-1")
    expect(mapCustomerFields({ id: "u", fullName: "Ada Okoye" }).group).toBe("Unassigned")
  })
})
