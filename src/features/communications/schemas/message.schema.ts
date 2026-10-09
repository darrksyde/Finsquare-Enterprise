import { z } from "zod"
import { MESSAGE_CATEGORIES, MESSAGE_CHANNELS } from "../types/message.types"

/**
 * What the composer must satisfy before it can send. Kept deliberately thin: the cost and balance
 * rules are not validation, they are the service's job, because only the service knows the price
 * and the current balance.
 */
export const messageDraftSchema = z
  .object({
    channel: z.enum(MESSAGE_CHANNELS),
    category: z.enum(MESSAGE_CATEGORIES),
    subject: z.string().trim().max(140, "Keep the subject under 140 characters").optional(),
    body: z
      .string()
      .trim()
      .min(1, "Write a message before sending")
      .max(1_400, "Keep the message under 1,400 characters"),
    recipientCount: z.number().int().min(1, "Choose at least one recipient"),
  })
  .refine((draft) => draft.channel === "SMS" || Boolean(draft.subject?.trim()), {
    message: "Add a subject for an email message",
    path: ["subject"],
  })

export const topUpSchema = z.object({
  walletId: z.string().min(1, "Choose a wallet"),
  amount: z
    .number({ error: "Enter an amount" })
    .positive("Amount must be greater than zero")
    .max(10_000_000, "Amount is too large"),
})

export function firstError(result: { success: boolean; error?: z.ZodError }): string | null {
  return result.success ? null : (result.error?.issues[0]?.message ?? "Invalid input")
}

export type MessageDraftValues = z.infer<typeof messageDraftSchema>
export type TopUpValues = z.infer<typeof topUpSchema>
