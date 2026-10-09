import { describe, expect, it } from "vitest"
import { applicationDecisionSchema, joinSettingsSchema, memberApplicationFormSchema } from "./member-application.schema"

describe("member application form schema", () => {
  it("accepts a name and a group", () => {
    expect(memberApplicationFormSchema.safeParse({ name: "Member onboarding", groupId: "group-executive" }).success).toBe(true)
  })

  it("rejects a missing name or group", () => {
    expect(memberApplicationFormSchema.safeParse({ name: "  ", groupId: "group-executive" }).success).toBe(false)
    expect(memberApplicationFormSchema.safeParse({ name: "Onboarding", groupId: "" }).success).toBe(false)
  })

  it("trims before measuring", () => {
    const result = memberApplicationFormSchema.safeParse({ name: "  Onboarding  ", groupId: " group-executive " })
    expect(result.success && result.data).toEqual({ name: "Onboarding", groupId: "group-executive" })
  })
})

describe("join settings schema", () => {
  it("only accepts the two joining modes", () => {
    expect(joinSettingsSchema.safeParse({ joinMode: "Open", groupId: "g", linkEnabled: true }).success).toBe(true)
    expect(joinSettingsSchema.safeParse({ joinMode: "Approval", groupId: "g", linkEnabled: false }).success).toBe(true)
    expect(joinSettingsSchema.safeParse({ joinMode: "Sometimes", groupId: "g", linkEnabled: true }).success).toBe(false)
    expect(joinSettingsSchema.safeParse({ joinMode: "Open", groupId: "", linkEnabled: true }).success).toBe(false)
  })
})

describe("decision schema", () => {
  it("requires a reason worth reading", () => {
    expect(applicationDecisionSchema.safeParse({ reason: "Duplicate application" }).success).toBe(true)
    expect(applicationDecisionSchema.safeParse({ reason: "  " }).success).toBe(false)
    expect(applicationDecisionSchema.safeParse({ reason: "no" }).success).toBe(false)
  })
})
