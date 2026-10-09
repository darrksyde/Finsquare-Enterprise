import { z } from "zod"
import {
  COMMISSION_MODELS,
  CONTRIBUTION_FORMS,
  CONTRIBUTION_FREQUENCIES,
  CONTRIBUTION_PAYMENT_METHOD_IDS,
  CONTRIBUTION_TYPES,
  PARTICIPANT_SCOPES,
  SCHEDULED_PAYOUT_INTERVALS,
} from "../types/contribution.types"

/** Validation at the boundary. The backend re-validates everything. */

export const amountSchema = z
  .number({ error: "Enter an amount" })
  .positive("Amount must be greater than zero")
  .max(1_000_000_000, "Amount is too large")

const optionalAmount = z.number().min(0, "Amount cannot be negative").optional()

export const contributionRecipientSchema = z
  .object({
    kind: z.enum(["organization", "member", "customer", "contributor"]),
    accountId: z.string().optional(),
    accountName: z.string().optional(),
    memberId: z.string().optional(),
    memberName: z.string().optional(),
    label: z.string().optional().default(""),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "organization" && !value.accountId) {
      ctx.addIssue({ code: "custom", path: ["accountId"], message: "Choose the organization account that holds the funds." })
    }
    if ((value.kind === "member" || value.kind === "customer") && !value.memberId) {
      ctx.addIssue({ code: "custom", path: ["memberId"], message: "Choose the member or customer this money is held for." })
    }
  })

export const contributionCommissionSchema = z
  .object({
    model: z.enum(COMMISSION_MODELS),
    percentage: z.number().min(0, "Percentage cannot be negative").max(100, "Percentage cannot exceed 100").optional(),
    fixedAmount: optionalAmount,
  })
  .superRefine((value, ctx) => {
    if (value.model === "percentage" && !value.percentage) {
      ctx.addIssue({ code: "custom", path: ["percentage"], message: "Enter the commission percentage." })
    }
    if (value.model === "fixed" && !value.fixedAmount) {
      ctx.addIssue({ code: "custom", path: ["fixedAmount"], message: "Enter the fixed commission amount." })
    }
  })

export const contributionPayoutSchema = z.object({
  mode: z.enum(["manual", "scheduled"]),
  scheduledDate: z.string().optional(),
  scheduledInterval: z.enum(SCHEDULED_PAYOUT_INTERVALS).optional(),
  approvalThreshold: z.number().min(0, "Threshold cannot be negative"),
})

export const createContributionSchema = z
  .object({
    name: z.string().trim().min(3, "Name must be at least 3 characters").max(80, "Name is too long"),
    description: z.string().trim().max(400, "Description is too long").optional(),
    type: z.enum(CONTRIBUTION_TYPES),
    form: z.enum(CONTRIBUTION_FORMS),
    participantScope: z.enum(PARTICIPANT_SCOPES),
    fixedAmount: optionalAmount,
    minimumAmount: optionalAmount,
    targetAmount: optionalAmount,
    frequencyBased: z.boolean(),
    frequency: z.enum(CONTRIBUTION_FREQUENCIES),
    customFrequency: z
      .object({
        label: z.string().trim().max(40, "Name is too long"),
        days: z.number().int("Use whole days").min(1, "Must repeat at least every day").max(365, "Maximum interval is 365 days"),
      })
      .optional(),
    startDate: z.string().min(1, "Choose a start date"),
    endDate: z.string().optional(),
    groupId: z.string().optional(),
    recipient: contributionRecipientSchema,
    commission: contributionCommissionSchema,
    payout: contributionPayoutSchema,
    paymentMethods: z.array(z.enum(CONTRIBUTION_PAYMENT_METHOD_IDS)).min(1, "Select at least one payment method"),
  })
  .superRefine((value, ctx) => {
    if (value.type === "Fixed" && !value.fixedAmount) {
      ctx.addIssue({ code: "custom", path: ["fixedAmount"], message: "Enter the amount expected per contribution." })
    }
    if (value.type === "Target" && !value.targetAmount) {
      ctx.addIssue({ code: "custom", path: ["targetAmount"], message: "Enter the target amount." })
    }
    if (value.frequencyBased && value.frequency === "None") {
      ctx.addIssue({ code: "custom", path: ["frequency"], message: "Choose how often this contribution is collected." })
    }
    if (!value.frequencyBased && value.frequency !== "None") {
      ctx.addIssue({ code: "custom", path: ["frequency"], message: "Contributors choose their own timing, so no frequency is needed." })
    }
    if (value.frequency === "Custom" && !value.customFrequency?.label.trim()) {
      ctx.addIssue({ code: "custom", path: ["customFrequency"], message: "Give this frequency a name" })
    }
    if (value.endDate && value.endDate < value.startDate) {
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "End date must be after the start date." })
    }
    if (value.type === "Fixed" && value.fixedAmount && value.minimumAmount && value.minimumAmount > value.fixedAmount) {
      ctx.addIssue({ code: "custom", path: ["minimumAmount"], message: "Minimum cannot exceed the fixed amount." })
    }
    if (value.payout.mode === "scheduled" && !value.payout.scheduledDate) {
      ctx.addIssue({ code: "custom", path: ["payout", "scheduledDate"], message: "Choose the first payout date." })
    }
  })

export const recordContributionPaymentSchema = z.object({
  contributionId: z.string().min(1),
  participantId: z.string().min(1, "Choose a contributor"),
  amount: amountSchema,
  method: z.enum(CONTRIBUTION_PAYMENT_METHOD_IDS),
  periodKey: z.string().optional(),
  note: z.string().trim().max(200).optional(),
})

export const requestContributionWithdrawalSchema = z.object({
  contributionId: z.string().min(1),
  participantId: z.string().optional(),
  kind: z.enum(["Full", "Partial", "Scheduled"]),
  amount: amountSchema,
  fees: z.number().min(0, "Fees cannot be negative").optional(),
  scheduledFor: z.string().optional(),
  note: z.string().trim().max(200).optional(),
})

export const publicContributionSchema = z.object({
  slug: z.string().min(1),
  memberId: z.string().optional(),
  contributorName: z.string().trim().min(2, "Enter your name"),
  phone: z.string().trim().optional(),
  email: z.string().trim().email("Enter a valid email address").optional().or(z.literal("")),
  amount: amountSchema,
  method: z.enum(CONTRIBUTION_PAYMENT_METHOD_IDS),
})

export type CreateContributionValues = z.infer<typeof createContributionSchema>
export type RecordContributionPaymentValues = z.infer<typeof recordContributionPaymentSchema>
export type RequestContributionWithdrawalValues = z.infer<typeof requestContributionWithdrawalSchema>
export type PublicContributionValues = z.infer<typeof publicContributionSchema>

export function firstError(result: { success: boolean; error?: z.ZodError }): string | null {
  return result.success ? null : (result.error?.issues[0]?.message ?? "Invalid input")
}

/** Field-level messages keyed by path, for form rendering. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join(".")
    if (!out[key]) out[key] = issue.message
  }
  return out
}
