import { z } from "zod"

export const amountSchema = z.number({ error: "Enter an amount" }).positive("Amount must be greater than zero").max(1_000_000_000, "Amount is too large")

export const fundSchema = z.object({ walletId: z.string().min(1, "Choose a wallet"), amount: amountSchema, method: z.string().min(1), reference: z.string().max(60).optional() })
export const transferSchema = z.object({ fromId: z.string().min(1, "Choose a source wallet"), toId: z.string().min(1, "Choose a destination wallet"), amount: amountSchema, reason: z.string().trim().min(3, "A reason is required"), reference: z.string().max(60).optional() })
export const createWalletSchema = z.object({ name: z.string().trim().min(3, "Name must be at least 3 characters"), type: z.string().min(1), branchId: z.string().optional(), openingBalance: z.number().min(0) })

export function firstError(result: { success: boolean; error?: z.ZodError }): string | null {
  return result.success ? null : (result.error?.issues[0]?.message ?? "Invalid input")
}
