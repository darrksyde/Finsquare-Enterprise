import { describe, expect, it } from "vitest"
import { createContributionSchema, publicContributionSchema, recordContributionPaymentSchema } from "./contribution.schema"

const validInput = () => ({
  name: "Ikeja Daily Ajo Savings",
  description: "Daily collection",
  type: "Fixed" as const,
  form: "Personal" as const,
  participantScope: "All" as const,
  fixedAmount: 2_000,
  frequencyBased: true,
  frequency: "Daily" as const,
  startDate: "2026-01-01",
  recipient: { kind: "organization" as const, accountId: "acct-main", label: "" },
  commission: { model: "percentage" as const, percentage: 5 },
  payout: { mode: "manual" as const, approvalThreshold: 100_000 },
  paymentMethods: ["wallet" as const, "cash" as const],
})

const issueFor = (result: ReturnType<typeof createContributionSchema.safeParse>, path: string) =>
  result.success ? undefined : result.error.issues.find((issue) => issue.path.join(".") === path)?.message

describe("create contribution schema", () => {
  it("accepts a complete fixed contribution", () => {
    expect(createContributionSchema.safeParse(validInput()).success).toBe(true)
  })

  it("requires an amount for a fixed contribution", () => {
    const input = { ...validInput(), fixedAmount: undefined }
    expect(issueFor(createContributionSchema.safeParse(input), "fixedAmount")).toBeDefined()
  })

  it("requires a target for a target contribution", () => {
    const input = { ...validInput(), type: "Target" as const, fixedAmount: undefined }
    expect(issueFor(createContributionSchema.safeParse(input), "targetAmount")).toBeDefined()
  })

  it("allows a flexible contribution without any amount", () => {
    const input = { ...validInput(), type: "Flexible" as const, fixedAmount: undefined }
    expect(createContributionSchema.safeParse(input).success).toBe(true)
  })

  it("rejects a scheduled frequency when the contribution is not frequency based", () => {
    const input = { ...validInput(), frequencyBased: false, frequency: "Daily" as const }
    expect(issueFor(createContributionSchema.safeParse(input), "frequency")).toBeDefined()
  })

  it("accepts contributors choosing their own timing", () => {
    const input = { ...validInput(), frequencyBased: false, frequency: "None" as const }
    expect(createContributionSchema.safeParse(input).success).toBe(true)
  })

  it("requires the custom frequency detail when Custom is selected", () => {
    const input = { ...validInput(), frequency: "Custom" as const }
    expect(issueFor(createContributionSchema.safeParse(input), "customFrequency")).toBeDefined()
  })

  it("ignores an unused custom frequency placeholder on a fixed schedule", () => {
    const input = { ...validInput(), frequency: "Weekly" as const, customFrequency: { label: "", days: 10 } }
    expect(createContributionSchema.safeParse(input).success).toBe(true)
  })

  it("requires a commission percentage when the percentage model is chosen", () => {
    const input = { ...validInput(), commission: { model: "percentage" as const } }
    expect(issueFor(createContributionSchema.safeParse(input), "commission.percentage")).toBeDefined()
  })

  it("accepts a General plan that charges no commission", () => {
    const input = { ...validInput(), form: "General" as const, commission: { model: "none" as const } }
    expect(createContributionSchema.safeParse(input).success).toBe(true)
  })

  it("accepts contributor recipients without naming a person", () => {
    const input = { ...validInput(), recipient: { kind: "contributor" as const, label: "" } }
    expect(createContributionSchema.safeParse(input).success).toBe(true)
  })

  it("requires an organization account for an organization recipient", () => {
    const input = { ...validInput(), recipient: { kind: "organization" as const, label: "" } }
    expect(issueFor(createContributionSchema.safeParse(input), "recipient.accountId")).toBeDefined()
  })

  it("requires a member for a member or customer recipient", () => {
    const input = { ...validInput(), recipient: { kind: "customer" as const, label: "" } }
    expect(issueFor(createContributionSchema.safeParse(input), "recipient.memberId")).toBeDefined()

    const withMember = { ...validInput(), recipient: { kind: "member" as const, memberId: "LFC-002479", label: "" } }
    expect(createContributionSchema.safeParse(withMember).success).toBe(true)
  })

  it("requires at least one payment method", () => {
    const input = { ...validInput(), paymentMethods: [] }
    expect(issueFor(createContributionSchema.safeParse(input), "paymentMethods")).toBeDefined()
  })

  it("requires a payout date for a scheduled payout mode", () => {
    const input = { ...validInput(), payout: { mode: "scheduled" as const, approvalThreshold: 0 } }
    expect(issueFor(createContributionSchema.safeParse(input), "payout.scheduledDate")).toBeDefined()
  })
})

describe("payment and public contribution schemas", () => {
  it("rejects a zero or negative payment", () => {
    const base = { contributionId: "cont-1", participantId: "p-1", method: "cash" as const }
    expect(recordContributionPaymentSchema.safeParse({ ...base, amount: 0 }).success).toBe(false)
    expect(recordContributionPaymentSchema.safeParse({ ...base, amount: 500 }).success).toBe(true)
  })

  it("accepts a public contribution without an account", () => {
    const result = publicContributionSchema.safeParse({
      slug: "community-emergency-fund",
      contributorName: "Bode Thomas",
      phone: "+2348051112233",
      email: "",
      amount: 25_000,
      method: "payment_link",
    })
    expect(result.success).toBe(true)
  })

  it("rejects a public contribution with an invalid email", () => {
    const result = publicContributionSchema.safeParse({
      slug: "community-emergency-fund",
      contributorName: "Bode Thomas",
      email: "not-an-email",
      amount: 25_000,
      method: "payment_link",
    })
    expect(result.success).toBe(false)
  })
})
