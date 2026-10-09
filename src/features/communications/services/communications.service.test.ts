import { describe, expect, it } from "vitest"
import { buildCommunicationDataset } from "../mocks/communications.mock"
import { createMockCommunicationRepository } from "../repositories/mock-communication.repository"
import { CommunicationError, CommunicationService, summarizeMessages, type CommunicationContext } from "./communications.service"
import { walletService } from "@/features/wallet/services/wallet.service"
import type { CommunicationDataset, ResolvedRecipient, SendMessageInput } from "../types/message.types"

const organizationId = "org-lagos-farmers"
const ada: CommunicationContext = { actor: { id: "admin-ada", name: "Ada Obi" }, mode: "live" }

const recipients = (count: number): ResolvedRecipient[] =>
  Array.from({ length: count }, (_, index) => ({
    memberId: `LFC-000${index}`,
    name: `Member ${index}`,
    phone: "+234 800 000 0000",
    email: `member${index}@example.demo`,
  }))

/** A workspace with a chosen balance, so the money rules can be exercised. */
const buildService = (balance?: number) => {
  const dataset: CommunicationDataset = buildCommunicationDataset()
  if (balance !== undefined) dataset.account.balance = balance
  return { service: new CommunicationService(createMockCommunicationRepository(dataset)), dataset }
}

const sms = (overrides: Partial<SendMessageInput> = {}): SendMessageInput => ({
  category: "General",
  channel: "SMS",
  body: "Hello everyone.",
  recipients: recipients(3),
  ...overrides,
})

describe("sending a message", () => {
  it("records the message and deducts exactly what it cost", async () => {
    const { service } = buildService(1_000)
    const before = await service.load(organizationId)
    const message = await service.sendMessage(organizationId, sms(), ada)
    const after = await service.load(organizationId)

    // 3 recipients × 1 SMS part × ₦4
    expect(message.cost).toBe(12)
    expect(message.segments).toBe(1)
    expect(message.recipientCount).toBe(3)
    expect(message.sender).toBe("Ada Obi")
    expect(after.account.balance).toBe(before.account.balance - 12)
    expect(after.messages[0].id).toBe(message.id)
  })

  it("charges per part for a long body", async () => {
    const { service } = buildService(1_000)
    const message = await service.sendMessage(organizationId, sms({ body: "x".repeat(320) }), ada)
    expect(message.segments).toBe(3)
    expect(message.cost).toBe(3 * 3 * 4)
  })

  it("refuses a send the balance cannot cover, and charges nothing", async () => {
    const { service } = buildService(10)
    await expect(service.sendMessage(organizationId, sms(), ada)).rejects.toBeInstanceOf(CommunicationError)
    const after = await service.load(organizationId)
    expect(after.account.balance).toBe(10)
    expect(after.messages.some((message) => message.sender === "Ada Obi")).toBe(false)
  })

  it("refuses an email with no subject", async () => {
    const { service } = buildService(1_000)
    await expect(
      service.sendMessage(organizationId, sms({ channel: "Email", body: "Hello." }), ada),
    ).rejects.toThrow(/subject/i)
  })

  it("refuses an empty body", async () => {
    const { service } = buildService(1_000)
    await expect(service.sendMessage(organizationId, sms({ body: "   " }), ada)).rejects.toThrow(/message/i)
  })

  it("refuses a send with no recipients", async () => {
    const { service } = buildService(1_000)
    await expect(service.sendMessage(organizationId, sms({ recipients: [] }), ada)).rejects.toThrow(/recipient/i)
  })

  it("keeps the {name} template and personalises per recipient", async () => {
    const { service } = buildService(1_000)
    const message = await service.sendMessage(
      organizationId,
      sms({ body: "Hi {name}, welcome.", recipients: [{ name: "Adewale Johnson", phone: "+234 1" }] }),
      ada,
    )
    // The stored body stays a template: one message can greet people by different names.
    expect(message.body).toBe("Hi {name}, welcome.")
    expect(message.recipients[0].name).toBe("Adewale Johnson")
  })

  it("charges nobody who has no phone number, and records why they failed", async () => {
    const { service } = buildService(1_000)
    const message = await service.sendMessage(
      organizationId,
      sms({ recipients: [{ name: "No Phone", email: "n@example.demo" }] }),
      ada,
    )
    expect(message.cost).toBe(0)
    expect(message.status).toBe("Failed")
    expect(message.recipients[0].failureReason).toMatch(/phone/i)
    expect(message.recipients[0].channel).toBe("SMS")
  })

  it("charges exactly what it estimated, whatever the mix of contacts", async () => {
    const { service } = buildService(1_000)
    const message = await service.sendMessage(
      organizationId,
      sms({
        channel: "Both",
        subject: "Branch hours",
        recipients: [
          { name: "Both", phone: "+234 1", email: "both@example.demo" },
          { name: "Email Only", email: "email@example.demo" },
          { name: "Phone Only", phone: "+234 2" },
          { name: "Neither" },
        ],
      }),
      ada,
    )
    // 2 people have a phone number, so 2 texts are submitted and nobody else is billed.
    expect(message.cost).toBe(2 * 1 * 4)
    expect(message.recipientCount).toBe(4)
    expect(message.recipients.find((row) => row.name === "Email Only")?.cost).toBe(0)
    expect(message.recipients.find((row) => row.name === "Neither")?.cost).toBe(0)
  })

  it("emails without charge when the channel is email", async () => {
    const { service } = buildService(1_000)
    const message = await service.sendMessage(
      organizationId,
      sms({ channel: "Email", subject: "AGM", body: "See you there." }),
      ada,
    )
    expect(message.cost).toBe(0)
    expect((await service.load(organizationId)).account.balance).toBe(1_000)
  })
})

describe("topping up the balance", () => {
  it("debits the wallet and credits the SMS balance", async () => {
    const { service } = buildService(100)
    const wallets = await walletService.load()
    const wallet = wallets.wallets.find((row) => row.type === "Main Organization")!
    const walletBefore = wallet.availableBalance

    const result = await service.topUpBalance(organizationId, { amount: 500, walletId: wallet.id }, ada)

    expect(result.balance).toBe(600)
    expect((await service.load(organizationId)).topUps[0]).toMatchObject({
      amount: 500,
      walletId: wallet.id,
      createdBy: "Ada Obi",
    })
    const after = (await walletService.load()).wallets.find((row) => row.id === wallet.id)!
    expect(after.availableBalance).toBe(walletBefore - 500)
  })

  it("refuses an amount that is not a positive number", async () => {
    const { service } = buildService(100)
    const wallets = await walletService.load()
    const wallet = wallets.wallets[0]
    await expect(
      service.topUpBalance(organizationId, { amount: 0, walletId: wallet.id }, ada),
    ).rejects.toThrow(/greater than zero/i)
  })

  it("refuses a wallet from another organization", async () => {
    const { service } = buildService(100)
    await expect(
      service.topUpBalance(organizationId, { amount: 100, walletId: "w-does-not-exist" }, ada),
    ).rejects.toThrow(/wallet/i)
  })
})

describe("summarizeMessages", () => {
  it("counts sent, scheduled and failed, and totals the spend", async () => {
    const { dataset } = buildService()
    const summary = summarizeMessages(dataset.messages)

    expect(summary.total).toBe(dataset.messages.length)
    expect(summary.reach).toBe(dataset.messages.reduce((sum, message) => sum + message.recipientCount, 0))
    expect(summary.spend).toBeCloseTo(dataset.messages.reduce((sum, message) => sum + message.cost, 0), 2)
    expect(summary.scheduled).toBeGreaterThan(0)
  })
})
