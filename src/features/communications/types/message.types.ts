import type { EntityId } from "@/types"

export const MESSAGE_CHANNELS = ["SMS", "Email", "Both"] as const
export type MessageChannel = typeof MESSAGE_CHANNELS[number]

/** A `Scheduled` message is one whose send time has not arrived yet. */
export const MESSAGE_STATUSES = ["Sent", "Scheduled", "Failed", "Partially sent"] as const
export type MessageStatus = typeof MESSAGE_STATUSES[number]

export const MESSAGE_CATEGORIES = ["General", "Contribution reminder", "Loan reminder", "Dues reminder"] as const
export type MessageCategory = typeof MESSAGE_CATEGORIES[number]

export const DELIVERY_STATUSES = ["Delivered", "Failed", "Pending"] as const
export type DeliveryStatus = typeof DELIVERY_STATUSES[number]

/** The channel one person was actually reached on. For a `Both` message this is the primary
 * channel — SMS when there is a phone number, email otherwise — because a person is one recipient
 * row, not two. `estimateCost` counts the email copy alongside it. */
export type DeliveryChannel = "SMS" | "Email"

export interface MessageRecipient {
  id: EntityId
  /** Absent when the person was picked from a list that is not the member registry. */
  memberId?: EntityId
  name: string
  phone?: string
  email?: string
  channel: DeliveryChannel
  status: DeliveryStatus
  failureReason?: string
  /** What this recipient cost — SMS parts × rate. Email is free. */
  cost: number
}

/** What a reminder was generated from, so the history can point back at the record. */
export interface MessageContext {
  contributionId?: EntityId
  contributionName?: string
  loanId?: EntityId
  loanReference?: string
  duesPlanId?: EntityId
  duesPlanName?: string
}

export interface Message {
  id: EntityId
  organizationId: EntityId
  category: MessageCategory
  channel: MessageChannel
  subject?: string
  /** The message as composed: the `{name}` token is intact, substitution happens per recipient. */
  body: string
  recipients: MessageRecipient[]
  recipientCount: number
  deliveredCount: number
  failedCount: number
  /** SMS parts in the body. One part costs `costPerSms`. */
  segments: number
  cost: number
  status: MessageStatus
  scheduledFor?: string
  createdAt: string
  sentAt?: string
  sender: string
  context?: MessageContext
}

export interface SmsAccount {
  organizationId: EntityId
  balance: number
  costPerSms: number
  currency: string
  updatedAt: string
}

/** One funding movement into the SMS balance, kept so the balance is auditable like a wallet. */
export interface SmsTopUp {
  id: EntityId
  organizationId: EntityId
  amount: number
  walletId: EntityId
  walletName: string
  reference: string
  createdBy: string
  createdAt: string
  simulated: boolean
}

export interface CommunicationDataset {
  account: SmsAccount
  messages: Message[]
  topUps: SmsTopUp[]
}

/** A person the compose screen has selected, before a channel has been decided for them. */
export interface ResolvedRecipient {
  memberId?: EntityId
  name: string
  phone?: string
  email?: string
}

/** What the compose form holds. Sending turns this into a `Message`. */
export interface SendMessageInput {
  category: MessageCategory
  channel: MessageChannel
  subject?: string
  body: string
  recipients: ResolvedRecipient[]
  context?: MessageContext
}

export interface MessageSummary {
  total: number
  sent: number
  scheduled: number
  failed: number
  /** People reached across every message in the set. */
  reach: number
  spend: number
}
