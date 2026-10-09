import type {
  DeliveryChannel,
  DeliveryStatus,
  MessageChannel,
  MessageRecipient,
  MessageStatus,
  ResolvedRecipient,
} from "../types/message.types"

/** One GSM-7 SMS carries 160 characters. */
export const SMS_SINGLE_SEGMENT = 160
/**
 * A longer message is split into parts, and every part after the first reserves 7 characters for
 * the concatenation header. That is why a multi-part message fits 153 characters per part, not 160.
 */
export const SMS_MULTIPART_SEGMENT = 153

const round2 = (value: number) => Math.round(value * 100) / 100

/** How many SMS parts a body will be sent as. Empty text costs nothing. */
export function smsSegments(body: string): number {
  const length = body.trim().length
  if (length === 0) return 0
  if (length <= SMS_SINGLE_SEGMENT) return 1
  return Math.ceil(length / SMS_MULTIPART_SEGMENT)
}

/** The channels a message-level setting resolves to. `Both` really does mean both. */
export function channelsFor(channel: MessageChannel): DeliveryChannel[] {
  return channel === "Both" ? ["SMS", "Email"] : [channel]
}

/** A person can be reached on SMS when they have a phone number, and on email when they have an address. */
export function reachableOn(recipient: ResolvedRecipient, channel: DeliveryChannel): boolean {
  return channel === "SMS" ? Boolean(recipient.phone?.trim()) : Boolean(recipient.email?.trim())
}

/** The first channel this person can actually be reached on, or `undefined` if neither works. */
export function deliveryChannelFor(
  recipient: ResolvedRecipient,
  channel: MessageChannel,
): DeliveryChannel | undefined {
  return channelsFor(channel).find((candidate) => reachableOn(recipient, candidate))
}

export interface MessageCost {
  /** SMS parts in the body. */
  segments: number
  /** People who will be texted. */
  smsRecipients: number
  /** People who will be emailed. */
  emailRecipients: number
  /** People with neither a phone number nor an address — they cannot be reached at all. */
  unreachable: number
  smsCost: number
  total: number
}

/**
 * What a send will cost before it happens. Only SMS is billed: this organization pays per text,
 * while email goes through the organization's own mailbox at no per-message charge. A later
 * provider integration adds its own line to `total` here.
 */
export function estimateCost(input: {
  channel: MessageChannel
  body: string
  recipients: ResolvedRecipient[]
  costPerSms: number
}): MessageCost {
  const { channel, body, recipients, costPerSms } = input
  const segments = smsSegments(body)
  const channels = channelsFor(channel)

  const smsRecipients =
    channel === "Email" ? 0 : recipients.filter((recipient) => reachableOn(recipient, "SMS")).length
  const emailRecipients =
    channel === "SMS" ? 0 : recipients.filter((recipient) => reachableOn(recipient, "Email")).length
  const unreachable = recipients.filter(
    (recipient) => !channels.some((candidate) => reachableOn(recipient, candidate)),
  ).length

  const smsCost = round2(segments * smsRecipients * costPerSms)
  return { segments, smsRecipients, emailRecipients, unreachable, smsCost, total: smsCost }
}

/** How many whole texts the balance still buys. */
export function smsRemaining(balance: number, costPerSms: number): number {
  if (costPerSms <= 0) return 0
  return Math.floor(Math.max(0, balance) / costPerSms)
}

/** Floating-point tolerant affordability check; the backend re-checks the real balance. */
export const canAfford = (balance: number, cost: number) => cost <= balance + 1e-9

/** The token an administrator writes to have each person greeted by name. */
export const NAME_TOKEN = "{name}"

export const usesNameToken = (body: string) => body.includes(NAME_TOKEN)

export const firstNameOf = (name: string) => name.trim().split(/\s+/)[0] ?? ""

/** How much of a message a list row shows before it is clipped. */
export const PREVIEW_CHARS = 72

/**
 * The one line a history row shows for a message.
 *
 * Capped by character count rather than by CSS alone: a message is arbitrary length, and a list
 * that let one run to 137 characters pushed its own columns off the screen. The first non-blank
 * line is used so a body that opens with a blank line still previews the words the person wrote.
 */
export function preview(body: string, max = PREVIEW_CHARS): string {
  const line = (body.split("\n").find((candidate) => candidate.trim()) ?? "").trim()
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line
}

/**
 * Substitutes `{name}` for one person. Every occurrence is replaced — `split`/`join` rather than
 * `replace` so a body that greets the recipient twice behaves.
 */
export const personalise = (body: string, name: string) =>
  body.split(NAME_TOKEN).join(firstNameOf(name))

/**
 * A stable number for one recipient. Deterministic on purpose: delivery is simulated, and a
 * screen that reshuffled its outcomes on every render would be both alarming and untestable.
 */
function stableHash(recipient: ResolvedRecipient): number {
  const key = `${recipient.memberId ?? recipient.name}:${recipient.phone ?? ""}:${recipient.email ?? ""}`
  let hash = 0
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0
  }
  return hash
}

/**
 * Stands in for the provider's delivery report. A backend replaces this with the real one; until
 * then it gives history genuine `Failed` and `Partially sent` rows instead of a seed-only status.
 */
export function simulateDelivery(
  recipient: ResolvedRecipient,
  channel: DeliveryChannel,
): { status: DeliveryStatus; failureReason?: string } {
  if (!reachableOn(recipient, channel)) {
    return {
      status: "Failed",
      failureReason: channel === "SMS" ? "No phone number on record" : "No email address on record",
    }
  }
  if (stableHash(recipient) % 12 === 0) {
    return {
      status: "Failed",
      failureReason: channel === "SMS" ? "Network rejected the message" : "Mailbox rejected the message",
    }
  }
  return { status: "Delivered" }
}

export interface DeliverySummary {
  delivered: number
  failed: number
  pending: number
  /** Never `Scheduled` — that comes from the send time, not from delivery. */
  status: Extract<MessageStatus, "Sent" | "Failed" | "Partially sent">
}

/**
 * Rolls the per-recipient outcomes into the number shown on the history row. A message that
 * reached nobody is `Failed`; one that reached some is `Partially sent`.
 */
export function summariseDelivery(recipients: MessageRecipient[]): DeliverySummary {
  const delivered = recipients.filter((recipient) => recipient.status === "Delivered").length
  const failed = recipients.filter((recipient) => recipient.status === "Failed").length
  const pending = recipients.filter((recipient) => recipient.status === "Pending").length
  const status: DeliverySummary["status"] =
    recipients.length > 0 && failed === recipients.length
      ? "Failed"
      : failed > 0
        ? "Partially sent"
        : "Sent"
  return { delivered, failed, pending, status }
}
