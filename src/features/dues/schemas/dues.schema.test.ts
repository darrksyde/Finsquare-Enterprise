import { describe, expect, it } from "vitest"
import { createDuesPlanSchema, firstError } from "./dues.schema"
function draft(overrides: Record<string, unknown> = {}) {
  return {
    name: "Monthly Association Dues",
    amount: 2000,
    frequency: "Monthly",
    startDate: "2026-07-01",
    scope: "All",
    lien: { enabled: true, graceDays: 5, autoRecover: true },
    rosterCount: 12,
    ...overrides,
  }
}
describe("createDuesPlanSchema", () => {
  it("accepts a complete plan", () => {
    expect(createDuesPlanSchema.safeParse(draft()).success).toBe(true)
  })
  it("insists on a name and a positive amount", () => {
    expect(firstError(createDuesPlanSchema.safeParse(draft({ name: "AB" })))).toMatch(/at least 3 characters/)
    expect(firstError(createDuesPlanSchema.safeParse(draft({ amount: 0 })))).toMatch(/greater than zero/)
    expect(firstError(createDuesPlanSchema.safeParse(draft({ amount: -10 })))).toMatch(/greater than zero/)
  })
  it("asks for an interval when the frequency is Custom", () => {
    expect(createDuesPlanSchema.safeParse(draft({ frequency: "Custom" })).success).toBe(false)
    expect(
      createDuesPlanSchema.safeParse(
        draft({
          frequency: "Custom",
          customFrequency: { label: "Every 10 days", days: 10 },
        }),
      ).success,
    ).toBe(true)
  })
  it("refuses an end date before the start date", () => {
    expect(
      firstError(createDuesPlanSchema.safeParse(draft({ startDate: "2026-07-01", endDate: "2026-06-01" }))),
    ).toMatch(/cannot be before/)
  })
  it("insists the selected audience is actually chosen", () => {
    expect(firstError(createDuesPlanSchema.safeParse(draft({ scope: "Group" })))).toMatch(/Choose the group/)
    expect(firstError(createDuesPlanSchema.safeParse(draft({ scope: "Branch" })))).toMatch(/Choose the branch/)
    expect(firstError(createDuesPlanSchema.safeParse(draft({ scope: "Selected" })))).toMatch(/at least one member/)
    expect(createDuesPlanSchema.safeParse(draft({ scope: "Selected", memberIds: ["m1"] })).success).toBe(true)
  })
  it("refuses a plan that would cover nobody", () => {
    expect(firstError(createDuesPlanSchema.safeParse(draft({ rosterCount: 0 })))).toMatch(/cover nobody/)
  })
  it("validates the lien rules", () => {
    expect(
      createDuesPlanSchema.safeParse(draft({ lien: { enabled: true, graceDays: -1, autoRecover: true } })).success,
    ).toBe(false)
    expect(
      createDuesPlanSchema.safeParse(draft({ lien: { enabled: true, graceDays: 400, autoRecover: true } })).success,
    ).toBe(false)
    expect(
      createDuesPlanSchema.safeParse(draft({ lien: { enabled: false, graceDays: 0, autoRecover: false } })).success,
    ).toBe(true)
  })
})
