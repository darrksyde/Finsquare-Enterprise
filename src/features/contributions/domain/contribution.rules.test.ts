import { describe, expect, it } from "vitest"
import {
  commissionApplies,
  isOpenToEveryone,
  isPersonal,
  keepsRunningAfterPayout,
  memberLinkPath,
  publicLinkAvailable,
  publicLinkPath,
  recipientHolderName,
  recipientLabel,
} from "./contribution.rules"
import type { Contribution } from "../types/contribution.types"

function contribution(overrides: Partial<Contribution> = {}): Contribution {
  return {
    id: "cont-1",
    organizationId: "org-test",
    name: "Test Ajo",
    type: "Fixed",
    form: "Personal",
    participantScope: "All",
    fixedAmount: 2_000,
    frequencyBased: true,
    frequency: "Daily",
    startDate: "2026-01-01",
    recipient: { kind: "organization", accountId: "acct-1", label: "Org account" },
    commission: { model: "none" },
    payout: { mode: "manual", approvalThreshold: 100_000 },
    paymentMethods: [],
    status: "Active",
    currency: "NGN",
    createdAt: "2026-01-01T00:00:00.000Z",
    createdBy: "Ada Obi",
    ...overrides,
  }
}

describe("contribution form", () => {
  it("treats Personal plans as the ones that hold a balance per member", () => {
    expect(isPersonal(contribution())).toBe(true)
    expect(isPersonal(contribution({ form: "General" }))).toBe(false)
  })

  it("keeps a Personal plan running after a payout and closes a General pool", () => {
    expect(keepsRunningAfterPayout(contribution())).toBe(true)
    expect(keepsRunningAfterPayout(contribution({ form: "General" }))).toBe(false)
  })

  it("only charges commission on a Personal plan", () => {
    const withCommission = { commission: { model: "percentage" as const, percentage: 5 } }
    expect(commissionApplies(contribution(withCommission))).toBe(true)
    expect(commissionApplies(contribution({ ...withCommission, form: "General" }))).toBe(false)
    expect(commissionApplies(contribution())).toBe(false)
  })

  it("treats Open as the only scope that opens the pool link", () => {
    expect(isOpenToEveryone(contribution({ participantScope: "Open" }))).toBe(true)
    expect(isOpenToEveryone(contribution({ participantScope: "All" }))).toBe(false)
    expect(isOpenToEveryone(contribution({ participantScope: "Selected" }))).toBe(false)
  })
})

describe("links", () => {
  const linked = contribution({ publicLink: { slug: "ikeja-ajo", enabled: true, createdAt: "2026-01-01T00:00:00.000Z" } })

  it("works the pool link only while it is enabled and the plan is Active", () => {
    expect(publicLinkAvailable(linked)).toBe(true)
    expect(publicLinkAvailable({ ...linked, status: "Closed" })).toBe(false)
    expect(publicLinkAvailable(contribution({ publicLink: { slug: "x", enabled: false, createdAt: "2026-01-01" } }))).toBe(false)
  })

  it("addresses a member's own link by member id", () => {
    expect(publicLinkPath(linked)).toBe("/contribute/ikeja-ajo")
    expect(memberLinkPath(linked, "LFC-002479")).toBe("/contribute/ikeja-ajo/m/LFC-002479")
    expect(memberLinkPath(contribution(), "LFC-002479")).toBeUndefined()
  })
})

describe("recipients", () => {
  it("names each recipient kind without leaking an account id", () => {
    expect(recipientLabel({ kind: "organization", accountName: "Coop", label: "" })).toBe("Organization account: Coop")
    expect(recipientLabel({ kind: "member", memberName: "Adewale", label: "" })).toBe("Member account: Adewale")
    expect(recipientLabel({ kind: "customer", memberName: "Ngozi", label: "" })).toBe("Customer account: Ngozi")
    expect(recipientLabel({ kind: "contributor", label: "" })).toBe("Each contributor's own account")
  })

  it("describes who the money is held for", () => {
    expect(recipientHolderName({ kind: "organization", accountName: "Coop", label: "" })).toBe("Coop")
    expect(recipientHolderName({ kind: "member", memberName: "Adewale", label: "" })).toBe("Adewale")
    expect(recipientHolderName({ kind: "contributor", label: "" })).toBe("each contributor")
  })
})
