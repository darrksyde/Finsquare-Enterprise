import { describe, expect, it } from "vitest"
import {
  canAfford,
  deliveryChannelFor,
  estimateCost,
  personalise,
  PREVIEW_CHARS,
  preview,
  smsRemaining,
  smsSegments,
  summariseDelivery,
  simulateDelivery,
  usesNameToken,
} from "./messaging"
import type { MessageRecipient, ResolvedRecipient } from "../types/message.types"

const recipient = (overrides: Partial<ResolvedRecipient> = {}): ResolvedRecipient => ({
  memberId: "LFC-002481",
  name: "Adewale Johnson",
  phone: "+234 803 214 7780",
  email: "adewale.j@example.demo",
  ...overrides,
})

describe("smsSegments", () => {
  it("charges nothing for an empty body", () => {
    expect(smsSegments("")).toBe(0)
    expect(smsSegments("   ")).toBe(0)
  })

  it("fits up to 160 characters in one part", () => {
    expect(smsSegments("a")).toBe(1)
    expect(smsSegments("a".repeat(160))).toBe(1)
  })

  it("splits past 160 using the 153-character concatenated size", () => {
    // 161 characters needs two parts, and the pair carries 306 characters of payload, not 320.
    expect(smsSegments("a".repeat(161))).toBe(2)
    expect(smsSegments("a".repeat(306))).toBe(2)
    expect(smsSegments("a".repeat(307))).toBe(3)
  })
})

describe("estimateCost", () => {
  it("charges segments per reachable recipient", () => {
    const cost = estimateCost({
      channel: "SMS",
      body: "a".repeat(200),
      recipients: [recipient(), recipient({ memberId: "LFC-002479", name: "Chinedu Okafor" })],
      costPerSms: 4,
    })
    expect(cost.segments).toBe(2)
    expect(cost.smsRecipients).toBe(2)
    expect(cost.smsCost).toBe(16)
    expect(cost.total).toBe(16)
  })

  it("bills nobody who has no phone number", () => {
    const cost = estimateCost({
      channel: "SMS",
      body: "Reminder",
      recipients: [recipient(), recipient({ phone: undefined, name: "No Phone" })],
      costPerSms: 4,
    })
    expect(cost.smsRecipients).toBe(1)
    expect(cost.smsCost).toBe(4)
    expect(cost.unreachable).toBe(1)
  })

  it("costs nothing on email alone", () => {
    const cost = estimateCost({
      channel: "Email",
      body: "a".repeat(600),
      recipients: [recipient()],
      costPerSms: 4,
    })
    expect(cost.smsRecipients).toBe(0)
    expect(cost.total).toBe(0)
    expect(cost.emailRecipients).toBe(1)
  })

  it("counts both channels separately for Both", () => {
    const cost = estimateCost({
      channel: "Both",
      body: "Reminder",
      recipients: [
        recipient(),
        recipient({ memberId: "x", name: "Email Only", phone: undefined }),
        recipient({ memberId: "y", name: "Phone Only", email: undefined }),
      ],
      costPerSms: 4,
    })
    expect(cost.smsRecipients).toBe(2)
    expect(cost.emailRecipients).toBe(2)
    expect(cost.total).toBe(8)
    expect(cost.unreachable).toBe(0)
  })

  it("reports someone with neither channel as unreachable", () => {
    const cost = estimateCost({
      channel: "Both",
      body: "Reminder",
      recipients: [recipient({ phone: undefined, email: undefined })],
      costPerSms: 4,
    })
    expect(cost.unreachable).toBe(1)
    expect(cost.total).toBe(0)
  })
})

describe("balance helpers", () => {
  it("counts whole texts the balance buys", () => {
    expect(smsRemaining(10_000, 4)).toBe(2_500)
    expect(smsRemaining(10, 4)).toBe(2)
    expect(smsRemaining(0, 4)).toBe(0)
    expect(smsRemaining(100, 0)).toBe(0)
  })

  it("affords a cost that exactly equals the balance", () => {
    expect(canAfford(16, 16)).toBe(true)
    expect(canAfford(15, 16)).toBe(false)
  })
})

describe("personalisation", () => {
  it("greets each person by first name", () => {
    expect(personalise("Hi {name}, your contribution is due.", "Adewale Johnson")).toBe(
      "Hi Adewale, your contribution is due.",
    )
  })

  it("replaces every occurrence", () => {
    expect(personalise("{name}, well done {name}!", "Fatima Bello")).toBe("Fatima, well done Fatima!")
  })

  it("leaves a body without the token untouched", () => {
    expect(personalise("Hello everyone.", "Adewale Johnson")).toBe("Hello everyone.")
    expect(usesNameToken("Hello everyone.")).toBe(false)
  })
})

describe("deliveryChannelFor", () => {
  it("falls back to email when there is no phone number", () => {
    expect(deliveryChannelFor(recipient({ phone: undefined }), "Both")).toBe("Email")
    expect(deliveryChannelFor(recipient(), "Both")).toBe("SMS")
    expect(deliveryChannelFor(recipient({ phone: undefined, email: undefined }), "Both")).toBeUndefined()
  })
})

describe("simulateDelivery", () => {
  it("fails someone with no phone number on SMS and says why", () => {
    const outcome = simulateDelivery(recipient({ phone: undefined }), "SMS")
    expect(outcome.status).toBe("Failed")
    expect(outcome.failureReason).toBe("No phone number on record")
  })

  it("fails someone with no address on email and says why", () => {
    const outcome = simulateDelivery(recipient({ email: undefined }), "Email")
    expect(outcome.status).toBe("Failed")
    expect(outcome.failureReason).toBe("No email address on record")
  })

  it("is stable for the same recipient", () => {
    const first = simulateDelivery(recipient(), "SMS")
    const second = simulateDelivery(recipient(), "SMS")
    expect(first).toEqual(second)
  })
})

describe("summariseDelivery", () => {
  const row = (status: MessageRecipient["status"]): MessageRecipient => ({
    id: `r-${status}-${Math.random()}`,
    name: "Someone",
    channel: "SMS",
    status,
    cost: 4,
  })

  it("calls it Sent when everything landed", () => {
    expect(summariseDelivery([row("Delivered"), row("Delivered")])).toMatchObject({
      delivered: 2,
      failed: 0,
      status: "Sent",
    })
  })

  it("calls it Partially sent when some failed", () => {
    const summary = summariseDelivery([row("Delivered"), row("Failed")])
    expect(summary.status).toBe("Partially sent")
    expect(summary.failed).toBe(1)
  })

  it("calls it Failed when nobody was reached", () => {
    expect(summariseDelivery([row("Failed"), row("Failed")]).status).toBe("Failed")
  })

  it("never reports Scheduled — that comes from the send time", () => {
    expect(summariseDelivery([row("Pending")]).status).toBe("Sent")
  })
})

describe("preview", () => {
  it("caps a long single-line message so a history row cannot widen the table", () => {
    const body = "Hi {name}, your ₦2,000 contribution to Ikeja Daily Ajo Savings is due today. Please make your contribution through your FinSquare wallet."
    const line = preview(body)
    expect(body.length).toBeGreaterThan(PREVIEW_CHARS)
    expect(line.length).toBeLessThanOrEqual(PREVIEW_CHARS)
    expect(line.endsWith("…")).toBe(true)
  })

  it("leaves a message that already fits untouched", () => {
    expect(preview("Annual general meeting — 18 October")).toBe("Annual general meeting — 18 October")
  })

  it("takes the first line that has words in it", () => {
    expect(preview("\n\nDear {name},\nThe office is closed.")).toBe("Dear {name},")
  })

  it("trims the space before the ellipsis rather than leaving a gap", () => {
    expect(preview("a".repeat(80))).toBe(`${"a".repeat(PREVIEW_CHARS - 1)}…`)
  })

  it("returns an empty string for a body with nothing in it", () => {
    expect(preview("   \n  ")).toBe("")
  })
})
