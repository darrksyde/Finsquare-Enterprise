import { describe, expect, it } from "vitest"
import { buildContributionDataset } from "../mocks/contributions.mock"
import { createMockContributionRepository } from "../repositories/mock-contribution.repository"
import { ContributionService, type MutationContext } from "./contributions.service"
import { publicLinkAvailable } from "../domain/contribution.rules"
import { memberWalletFor } from "@/features/wallet/domain/wallet.rules"
import { walletService } from "@/features/wallet/services/wallet.service"
import type { CreateContributionInput } from "../types/contribution.types"

const organizationId = "org-lagos-farmers"
const ada: MutationContext = { actor: { id: "admin-ada", name: "Ada Obi" }, mode: "live" }
const tunde: MutationContext = { actor: { id: "admin-tunde", name: "Tunde Alabi" }, mode: "live" }

const buildService = () => new ContributionService(createMockContributionRepository(buildContributionDataset()))
const ACTIVE_FIXED_AJO = "cont-ikeja-ajo"
const PARTICIPANT = `${ACTIVE_FIXED_AJO}:LFC-002479`

const createInput = (overrides: Partial<CreateContributionInput> = {}): CreateContributionInput => ({
  name: "Bode Thomas Weekly Ajo",
  type: "Fixed",
  form: "Personal",
  participantScope: "All",
  fixedAmount: 5_000,
  frequencyBased: true,
  frequency: "Weekly",
  startDate: "2026-01-01",
  recipient: { kind: "organization", accountId: "acct-main", label: "Org account" },
  commission: { model: "none" },
  payout: { mode: "manual", approvalThreshold: 100_000 },
  paymentMethods: ["wallet", "cash"],
  ...overrides,
})

describe("creating contributions", () => {
  it("creates an active contribution", async () => {
    const service = buildService()
    const created = await service.createContribution(organizationId, createInput(), ada)

    expect(created.status).toBe("Active")
    expect(created.name).toBe("Bode Thomas Weekly Ajo")

    const dataset = await service.load(organizationId)
    expect(dataset.contributions.some((c) => c.id === created.id)).toBe(true)
  })

  it("mints a unique link slug for every contribution", async () => {
    const service = buildService()
    const before = await service.load(organizationId)
    // The seeded Ikeja plan already owns this slug.
    expect(before.contributions.some((c) => c.publicLink?.slug === "ikeja-daily-ajo-savings")).toBe(true)

    const first = await service.createContribution(organizationId, createInput({ name: "Ikeja Daily Ajo Savings" }), ada)
    const second = await service.createContribution(organizationId, createInput({ name: "Ikeja Daily Ajo Savings" }), ada)

    expect(first.publicLink?.slug).toBe("ikeja-daily-ajo-savings-2")
    expect(second.publicLink?.slug).toBe("ikeja-daily-ajo-savings-3")
  })

  it("gives every plan a link", async () => {
    const service = buildService()
    const dataset = await service.load(organizationId)
    expect(dataset.contributions.every((c) => Boolean(c.publicLink?.slug))).toBe(true)
  })

  it("only opens the pool link when anyone may contribute", async () => {
    const service = buildService()
    const membersOnly = await service.createContribution(organizationId, createInput({ name: "Members Only Ajo" }), ada)
    const open = await service.createContribution(
      organizationId,
      createInput({ name: "Open Fund", participantScope: "Open" }),
      ada,
    )

    expect(membersOnly.publicLink?.enabled).toBe(false)
    expect(open.publicLink?.enabled).toBe(true)
  })

  it("omits the amount fields that do not belong to the chosen type", async () => {
    const service = buildService()
    const target = await service.createContribution(
      organizationId,
      createInput({ type: "Target", targetAmount: 500_000, fixedAmount: undefined }),
      ada,
    )
    expect(target.targetAmount).toBe(500_000)
    expect(target.fixedAmount).toBeUndefined()
  })

  it("keeps the group name for display instead of falling back to the id", async () => {
    const service = buildService()
    const created = await service.createContribution(
      organizationId,
      createInput({ groupId: "group-ikeja-savings", groupName: "Ikeja Savings Group" }),
      ada,
    )
    expect(created.groupId).toBe("group-ikeja-savings")
    expect(created.groupName).toBe("Ikeja Savings Group")
  })

  it("associates the selected group's members and schedules their periods", async () => {
    const service = buildService()
    const created = await service.createContribution(
      organizationId,
      createInput({
        groupId: "group-ikeja-savings",
        participants: [{ memberId: "LFC-002479", memberName: "Chinedu Okafor" }],
      }),
      ada,
    )

    const dataset = await service.load(organizationId)
    const roster = dataset.participants.filter((p) => p.contributionId === created.id)
    expect(roster).toHaveLength(1)
    expect(roster[0].memberName).toBe("Chinedu Okafor")
    expect(roster[0].expectedAmount).toBe(5_000)
    expect(dataset.periods.some((p) => p.contributionId === created.id)).toBe(true)
  })
})

describe("recording payments", () => {
  it("credits the contributor and settles the period", async () => {
    const service = buildService()
    const before = await service.load(organizationId)
    const participant = before.participants.find((p) => p.id === PARTICIPANT)!

    const transaction = await service.recordPayment(
      organizationId,
      { contributionId: ACTIVE_FIXED_AJO, participantId: PARTICIPANT, amount: 2_000, method: "cash" },
      ada,
    )

    expect(transaction?.status).toBe("Completed")
    const after = await service.load(organizationId)
    const updated = after.participants.find((p) => p.id === PARTICIPANT)!
    expect(updated.totalContributed).toBe(participant.totalContributed + 2_000)
    expect(updated.availableBalance).toBe(participant.availableBalance + 2_000)
    expect(after.transactions.length).toBe(before.transactions.length + 1)
  })

  it("refuses to record against an unknown contributor", async () => {
    const service = buildService()
    await expect(
      service.recordPayment(organizationId, { contributionId: ACTIVE_FIXED_AJO, participantId: "nobody", amount: 500, method: "cash" }, ada),
    ).resolves.toBeUndefined()
  })

  it("debits the member's own wallet when they pay by wallet", async () => {
    const service = buildService()
    const memberId = "LFC-002479"
    const before = memberWalletFor((await walletService.load()).wallets, memberId)!

    await service.recordPayment(
      organizationId,
      { contributionId: ACTIVE_FIXED_AJO, participantId: PARTICIPANT, amount: 2_000, method: "wallet" },
      ada,
    )

    const after = memberWalletFor((await walletService.load()).wallets, memberId)!
    expect(after.availableBalance).toBe(before.availableBalance - 2_000)
  })

  it("records nothing when the wallet cannot cover the contribution", async () => {
    const service = buildService()
    const memberId = "LFC-002438"
    const wallet = memberWalletFor((await walletService.load()).wallets, memberId)!
    const participantId = `${ACTIVE_FIXED_AJO}:${memberId}`
    const contributionBefore = await service.load(organizationId)
    const balanceBefore = contributionBefore.participants.find((p) => p.id === participantId)!.totalContributed

    await expect(
      service.recordPayment(
        organizationId,
        { contributionId: ACTIVE_FIXED_AJO, participantId, amount: wallet.availableBalance + 5_000, method: "wallet" },
        ada,
      ),
    ).rejects.toThrow(/Sufficient available balance/)

    const after = await service.load(organizationId)
    expect(after.participants.find((p) => p.id === participantId)!.totalContributed).toBe(balanceBefore)
    expect(memberWalletFor((await walletService.load()).wallets, memberId)!.availableBalance).toBe(wallet.availableBalance)
  })
})

describe("payouts and approval", () => {
  it("pays out immediately below the approval threshold and deducts commission", async () => {
    const service = buildService()
    const before = await service.load(organizationId)
    const participant = before.participants.find((p) => p.id === PARTICIPANT)!

    const withdrawal = await service.requestWithdrawal(
      organizationId,
      { contributionId: ACTIVE_FIXED_AJO, participantId: PARTICIPANT, kind: "Partial", amount: 50_000 },
      ada,
    )

    expect(withdrawal?.status).toBe("Completed")
    expect(withdrawal?.commission).toBe(2_500)
    expect(withdrawal?.netPayout).toBe(47_500)

    const after = await service.load(organizationId)
    expect(after.participants.find((p) => p.id === PARTICIPANT)!.availableBalance).toBe(participant.availableBalance - 50_000)
    expect(after.transactions.some((tx) => tx.type === "Withdrawal" && tx.direction === "debit")).toBe(true)
  })

  it("refuses to move a Personal plan's money as a whole pool", async () => {
    const service = buildService()
    await expect(
      service.requestWithdrawal(organizationId, { contributionId: ACTIVE_FIXED_AJO, kind: "Partial", amount: 10_000 }, ada),
    ).resolves.toBeUndefined()
  })

  it("refuses to pay one member out of a General pool", async () => {
    const service = buildService()
    await expect(
      service.requestWithdrawal(
        organizationId,
        { contributionId: "cont-community-fund", participantId: "cont-community-fund:LFC-002481", kind: "Partial", amount: 10_000 },
        ada,
      ),
    ).resolves.toBeUndefined()
  })

  it("pays a member's payout into their own wallet", async () => {    const service = buildService()
    const memberId = "LFC-002479"
    const before = memberWalletFor((await walletService.load()).wallets, memberId)!

    const withdrawal = await service.requestWithdrawal(
      organizationId,
      { contributionId: ACTIVE_FIXED_AJO, participantId: PARTICIPANT, kind: "Partial", amount: 30_000 },
      ada,
    )

    expect(withdrawal?.status).toBe("Completed")
    const after = memberWalletFor((await walletService.load()).wallets, memberId)!
    expect(after.availableBalance).toBe(before.availableBalance + withdrawal!.netPayout)
  })

  it("pays a General pool into the organization's wallet", async () => {
    const service = buildService()
    const mainWallet = (wallets: Awaited<ReturnType<typeof walletService.load>>["wallets"]) =>
      wallets.find((w) => w.type === "Main Organization")!
    const before = mainWallet((await walletService.load()).wallets)

    const withdrawal = await service.requestWithdrawal(
      organizationId,
      { contributionId: "cont-community-fund", kind: "Partial", amount: 50_000 },
      ada,
    )
    expect(withdrawal?.status).toBe("Pending approval")
    await service.approveWithdrawal(organizationId, withdrawal!.id, tunde)

    const after = mainWallet((await walletService.load()).wallets)
    expect(after.availableBalance).toBe(before.availableBalance + withdrawal!.netPayout)
  })

  it("waits for a second approver above the threshold and moves no money yet", async () => {
    const service = buildService()
    const before = await service.load(organizationId)

    const withdrawal = await service.requestWithdrawal(
      organizationId,
      { contributionId: ACTIVE_FIXED_AJO, participantId: PARTICIPANT, kind: "Partial", amount: 150_000 },
      ada,
    )

    expect(withdrawal?.status).toBe("Pending approval")
    const after = await service.load(organizationId)
    expect(after.transactions.length).toBe(before.transactions.length)
    expect(after.withdrawals.find((w) => w.id === withdrawal?.id)?.status).toBe("Pending approval")
  })

  it("does not let the requester approve their own payout", async () => {
    const service = buildService()
    const withdrawal = await service.requestWithdrawal(
      organizationId,
      { contributionId: ACTIVE_FIXED_AJO, participantId: PARTICIPANT, kind: "Partial", amount: 150_000 },
      ada,
    )

    await expect(service.approveWithdrawal(organizationId, withdrawal!.id, ada)).resolves.toBeUndefined()

    const after = await service.load(organizationId)
    expect(after.withdrawals.find((w) => w.id === withdrawal?.id)?.status).toBe("Pending approval")
  })

  it("releases the money when a different administrator approves", async () => {
    const service = buildService()
    const withdrawal = await service.requestWithdrawal(
      organizationId,
      { contributionId: ACTIVE_FIXED_AJO, participantId: PARTICIPANT, kind: "Partial", amount: 150_000 },
      ada,
    )
    const before = await service.load(organizationId)

    const approved = await service.approveWithdrawal(organizationId, withdrawal!.id, tunde)

    expect(approved?.status).toBe("Completed")
    expect(approved?.approvedBy).toBe("Tunde Alabi")
    const after = await service.load(organizationId)
    expect(after.transactions.length).toBe(before.transactions.length + 1)
  })

  it("closes a General pool after a full payout", async () => {
    const service = buildService()
    const fund = "cont-community-fund"
    const before = await service.load(organizationId)
    const original = before.contributions.find((c) => c.id === fund)!

    const withdrawal = await service.requestWithdrawal(organizationId, { contributionId: fund, kind: "Full", amount: 10_000 }, ada)
    expect(withdrawal?.status).toBe("Pending approval")

    await service.approveWithdrawal(organizationId, withdrawal!.id, tunde)

    const after = await service.load(organizationId)
    expect(after.contributions.find((c) => c.id === fund)?.status).toBe("Completed")
    expect(original.form).toBe("General")
  })

  it("keeps a Personal plan running after a partial payout", async () => {    const service = buildService()
    const withdrawal = await service.requestWithdrawal(
      organizationId,
      { contributionId: ACTIVE_FIXED_AJO, participantId: PARTICIPANT, kind: "Partial", amount: 20_000 },
      ada,
    )
    expect(withdrawal?.status).toBe("Completed")

    const after = await service.load(organizationId)
    expect(after.contributions.find((c) => c.id === ACTIVE_FIXED_AJO)?.status).toBe("Active")
  })
})

describe("public contribution links", () => {
  it("stops accepting contributions once the link is disabled", async () => {
    const service = buildService()
    await service.setPublicLink(organizationId, "cont-community-fund", false, ada)
    await expect(
      service.submitPublicContribution({ slug: "community-emergency-fund", contributorName: "Bode Thomas", amount: 10_000, method: "payment_link" }),
    ).resolves.toBeUndefined()
  })

  it("accepts a contribution from a non-member and issues a reference", async () => {
    const service = buildService()
    const receipt = await service.submitPublicContribution({
      slug: "community-emergency-fund",
      contributorName: "Ngozi Eze",
      phone: "+2348074459090",
      amount: 30_000,
      method: "payment_link",
    })

    expect(receipt?.reference).toMatch(/^PUB-/)
    expect(receipt?.amount).toBe(30_000)
    expect(receipt?.contributionName).toBe("Community Emergency Fund")

    const dataset = await service.load(organizationId)
    const participant = dataset.participants.find((p) => p.memberName === "Ngozi Eze" && p.isExternal)
    expect(participant).toBeDefined()
    expect(dataset.transactions.some((tx) => tx.external && tx.amount === 30_000)).toBe(true)
  })

  it("takes the link offline when the contribution is closed", async () => {
    const service = buildService()
    await service.setStatus(organizationId, "cont-community-fund", "Closed", ada)

    const dataset = await service.load(organizationId)
    const contribution = dataset.contributions.find((c) => c.id === "cont-community-fund")!
    expect(contribution.publicLink?.enabled).toBe(true)
    expect(publicLinkAvailable(contribution)).toBe(false)
  })
})
