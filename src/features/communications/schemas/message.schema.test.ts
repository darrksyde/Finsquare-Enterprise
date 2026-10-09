import { describe, expect, it } from "vitest"
import { firstError, messageDraftSchema, topUpSchema } from "./message.schema"

const draft = (overrides: Record<string, unknown> = {}) => ({
  channel: "SMS",
  category: "General",
  body: "Hello everyone.",
  recipientCount: 3,
  ...overrides,
})

describe("messageDraftSchema", () => {
  it("accepts an SMS without a subject", () => {
    expect(messageDraftSchema.safeParse(draft()).success).toBe(true)
  })

  it("demands a subject once email is involved", () => {
    expect(messageDraftSchema.safeParse(draft({ channel: "Email" })).success).toBe(false)
    expect(messageDraftSchema.safeParse(draft({ channel: "Both" })).success).toBe(false)
    expect(messageDraftSchema.safeParse(draft({ channel: "Email", subject: "AGM" })).success).toBe(true)
  })

  it("rejects a whitespace-only subject on email", () => {
    expect(messageDraftSchema.safeParse(draft({ channel: "Email", subject: "   " })).success).toBe(false)
  })

  it("rejects an empty body", () => {
    const result = messageDraftSchema.safeParse(draft({ body: "   " }))
    expect(result.success).toBe(false)
    expect(firstError(result)).toBe("Write a message before sending")
  })

  it("rejects sending to nobody", () => {
    const result = messageDraftSchema.safeParse(draft({ recipientCount: 0 }))
    expect(result.success).toBe(false)
    expect(firstError(result)).toBe("Choose at least one recipient")
  })

  it("caps the body", () => {
    expect(messageDraftSchema.safeParse(draft({ body: "a".repeat(1_401) })).success).toBe(false)
  })
})

describe("topUpSchema", () => {
  it("requires a wallet and a positive amount", () => {
    expect(topUpSchema.safeParse({ walletId: "", amount: 5_000 }).success).toBe(false)
    expect(topUpSchema.safeParse({ walletId: "w-main", amount: 0 }).success).toBe(false)
    expect(topUpSchema.safeParse({ walletId: "w-main", amount: -100 }).success).toBe(false)
    expect(topUpSchema.safeParse({ walletId: "w-main", amount: 5_000 }).success).toBe(true)
  })
})

describe("firstError", () => {
  it("returns null when the input is valid", () => {
    expect(firstError({ success: true })).toBeNull()
  })

  it("falls back to a generic message", () => {
    expect(firstError({ success: false })).toBe("Invalid input")
  })
})
