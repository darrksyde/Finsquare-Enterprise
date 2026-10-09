import { z } from "zod"

export const loanProductSchema = z
  .object({
    name: z.string().trim().min(2, "Enter a product name"),
    minAmount: z.number().positive("Minimum amount must be positive"),
    maxAmount: z.number().positive(),
    minDuration: z.number().positive(),
    maxDuration: z.number().positive(),
    interestRate: z.number().min(0).max(200),
    applicationFeePct: z.number().min(0).max(20),
    guarantorsRequired: z.number().int().min(0),
    maxActiveLoans: z.number().int().min(1),
  })
  .refine((v) => v.maxAmount >= v.minAmount, {
    message: "Maximum amount must be at least the minimum",
    path: ["maxAmount"],
  })
  .refine((v) => v.maxDuration >= v.minDuration, {
    message: "Maximum duration must be at least the minimum",
    path: ["maxDuration"],
  })
