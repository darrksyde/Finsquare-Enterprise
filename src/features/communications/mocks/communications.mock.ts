import { membersMock } from "@/features/members/mocks/members.mock"
import { SEED_ORGANIZATION_ID } from "@/lib/tenancy/seed-tenant"
import { todayISO } from "@/features/loans/domain/calculations"
import { DEFAULT_SMS_RATE } from "../constants"
import { smsSegments } from "../domain/messaging"
import { contributionReminder, loanReminder } from "../domain/templates"
import type {
  CommunicationDataset,
  DeliveryStatus,
  Message,
  MessageCategory,
  MessageChannel,
  MessageRecipient,
  ResolvedRecipient,
  SmsAccount,
} from "../types/message.types"

const organizationId = SEED_ORGANIZATION_ID

const daysAgo = (days: number, hour = 9) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(hour, (days * 7) % 60, 0, 0)
  return date.toISOString()
}

const daysAhead = (days: number, hour = 8) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

const today = todayISO

const member = (memberId: string) => membersMock.find((row) => row.id === memberId)

/** The seeded contacts, in the order the messages below reach for them. */
const memberIds = membersMock.map((row) => row.id)

function resolve(memberId: string): ResolvedRecipient {
  const row = member(memberId)
  return {
    memberId,
    name: row?.name ?? memberId,
    phone: row?.phone,
    email: row?.email,
  }
}

/**
 * Seeded outcomes mirror what `simulateDelivery` would produce, so history reads consistently
 * whether a message came from the seed or was just sent in this session.
 */
const DELIVERY_PATTERN: DeliveryStatus[] = [
  "Delivered",
  "Delivered",
  "Delivered",
  "Delivered",
  "Delivered",
  "Delivered",
  "Delivered",
  "Delivered",
  "Delivered",
  "Delivered",
  "Delivered",
  "Failed",
]

interface SeedMessage {
  id: string
  category: MessageCategory
  channel: MessageChannel
  body: string
  subject?: string
  recipients: ResolvedRecipient[]
  ageDays: number
  scheduledInDays?: number
  context?: Message["context"]
  /** Recipients whose delivery failed, by index. */
  failed?: number[]
  failureReason?: string
}

function buildMessage(seed: SeedMessage, account: SmsAccount): Message {
  const segments = smsSegments(seed.body)
  const failed = new Set(seed.failed ?? [])

  const recipients: MessageRecipient[] = seed.recipients.map((row, index) => {
    const channel = seed.channel === "Email" ? "Email" : row.phone?.trim() ? "SMS" : "Email"
    const missing = channel === "SMS" ? !row.phone?.trim() : !row.email?.trim()
    const status: DeliveryStatus = missing || failed.has(index) ? "Failed" : DELIVERY_PATTERN[index % DELIVERY_PATTERN.length]
    return {
      id: `${seed.id}:r${index + 1}`,
      memberId: row.memberId,
      name: row.name,
      phone: row.phone,
      email: row.email,
      channel,
      status,
      failureReason: missing
        ? channel === "SMS"
          ? "No phone number on record"
          : "No email address on record"
        : failed.has(index)
          ? (seed.failureReason ?? "Network rejected the message")
          : undefined,
      cost: channel === "SMS" ? segments * account.costPerSms : 0,
    }
  })

  const deliveredCount = recipients.filter((row) => row.status === "Delivered").length
  const failedCount = recipients.filter((row) => row.status === "Failed").length
  const cost = recipients.reduce((sum, row) => sum + row.cost, 0)
  const status: Message["status"] = seed.scheduledInDays
    ? "Scheduled"
    : failedCount > 0 && failedCount === recipients.length
      ? "Failed"
      : failedCount > 0
        ? "Partially sent"
        : "Sent"

  return {
    id: seed.id,
    organizationId,
    category: seed.category,
    channel: seed.channel,
    subject: seed.subject,
    body: seed.body,
    recipients,
    recipientCount: recipients.length,
    deliveredCount,
    failedCount,
    segments,
    cost,
    status,
    scheduledFor: seed.scheduledInDays ? daysAhead(seed.scheduledInDays) : undefined,
    createdAt: daysAgo(seed.ageDays),
    sentAt: seed.scheduledInDays ? undefined : daysAgo(seed.ageDays, 11),
    sender: "Adesola Ogunleye",
    context: seed.context,
  }
}

export function buildCommunicationDataset(now = today()): CommunicationDataset {
  const account: SmsAccount = {
    organizationId,
    balance: 10_000,
    costPerSms: DEFAULT_SMS_RATE,
    currency: "NGN",
    updatedAt: daysAgo(6, 14),
  }

  const everyMember = memberIds.map(resolve)
  const ikeja = [
    "LFC-002481",
    "LFC-002479",
    "LFC-002462",
    "LFC-002451",
    "LFC-002438",
    "LFC-002426",
  ].map(resolve)

  const contribution = contributionReminder({
    amount: 2_000,
    contributionName: "Ikeja Daily Ajo Savings",
    dueDate: now,
    today: now,
  })
  const loan = loanReminder({
    amount: 20_000,
    productName: "Business Loan",
    dueDate: now,
    today: now,
    reference: "LN-5001",
  })

  const seeds: SeedMessage[] = [
    {
      id: "msg-1",
      category: "Contribution reminder",
      channel: "SMS",
      body: contribution.body,
      recipients: ikeja,
      ageDays: 0,
      context: { contributionId: "cont-ikeja-ajo", contributionName: "Ikeja Daily Ajo Savings" },
      failed: [5],
    },
    {
      id: "msg-2",
      category: "Loan reminder",
      channel: "SMS",
      body: loan.body,
      recipients: [
        resolve("LFC-002481"),
        resolve("LFC-002479"),
        resolve("LFC-002462"),
      ],
      ageDays: 1,
      context: { loanId: "loan-1", loanReference: "LN-5001" },
      failed: [1],
      failureReason: "Handset unreachable",
    },
    {
      id: "msg-3",
      category: "General",
      channel: "Email",
      subject: "Annual general meeting — 18 October",
      body:
        "Dear {name},\n\nThe annual general meeting holds on 18 October at 10:00 at the Ikeja branch hall. " +
        "Please bring your membership card.\n\nLagos Farmers Cooperative",
      recipients: everyMember,
      ageDays: 3,
    },
    {
      id: "msg-4",
      category: "General",
      channel: "Both",
      subject: "New savings product: Target Savings",
      body:
        "Hi {name}, Target Savings is now open. Set a target and contribute at your own pace through your FinSquare wallet.",
      recipients: ikeja,
      ageDays: 5,
      failed: [4],
    },
    {
      id: "msg-5",
      category: "Contribution reminder",
      channel: "SMS",
      body: contributionReminder({
        amount: 10_000,
        contributionName: "Monthly Cooperative Contribution",
        dueDate: now,
        today: now,
      }).body,
      recipients: everyMember,
      ageDays: 7,
      context: { contributionId: "cont-monthly-coop", contributionName: "Monthly Cooperative Contribution" },
      failed: [0, 2, 3],
      failureReason: "Network rejected the message",
    },
    {
      id: "msg-6",
      category: "General",
      channel: "SMS",
      body: "Hi {name}, the Ikeja branch opens at 8:00 from Monday. Thank you for your patience during the works.",
      recipients: [resolve("LFC-002451"), resolve("LFC-002426")],
      ageDays: 11,
    },
    {
      id: "msg-7",
      category: "Loan reminder",
      channel: "SMS",
      body: loanReminder({
        amount: 115_807,
        productName: "Business Loan",
        dueDate: daysAgo(-8).slice(0, 10),
        today: now,
        reference: "LN-5001",
      }).body,
      recipients: [resolve("LFC-002481")],
      ageDays: 2,
      context: { loanId: "loan-1", loanReference: "LN-5001" },
    },
    {
      id: "msg-8",
      category: "General",
      channel: "SMS",
      body: "Hi {name}, your membership card is ready for collection at the Ikeja branch.",
      recipients: [resolve("LFC-002438")],
      ageDays: 1,
      failed: [0],
      failureReason: "No phone number on record",
    },
    {
      id: "msg-9",
      category: "General",
      channel: "Both",
      subject: "Scheduled maintenance this weekend",
      body:
        "Hi {name}, the FinSquare wallet will be unavailable on Saturday between 01:00 and 03:00 for maintenance.",
      recipients: everyMember,
      ageDays: 0,
      scheduledInDays: 2,
    },
  ]

  const messages = seeds.map((seed) => buildMessage(seed, account)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return {
    account,
    messages,
    topUps: [
      {
        id: "topup-1",
        organizationId,
        amount: 10_000,
        walletId: "w-main",
        walletName: "Main Organization Wallet",
        reference: "SMS-40318",
        createdBy: "Adesola Ogunleye",
        createdAt: daysAgo(6, 14),
        simulated: true,
      },
    ],
  }
}
