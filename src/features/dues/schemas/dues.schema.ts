import { z } from "zod"
import { DUES_FREQUENCIES, DUES_SCOPES } from "../types/dues.types"
/** Validation at the boundary. The backend re-validates everything. */
export const duesAmountSchema = z
  .number({ error: "Enter the amount each member owes" })
  .positive("Amount must be greater than zero")
  .max(1000000000, "Amount is too large")
export const duesLienRulesSchema = z.object({
  enabled: z.boolean(),
  graceDays: z.number().int().min(0, "Grace period cannot be negative").max(365, "Grace period is too long"),
  autoRecover: z.boolean(),
})
export const createDuesPlanSchema = z
  .object({
    name: z.string().trim().min(3, "Name must be at least 3 characters").max(80, "Name is too long"),
    description: z.string().trim().max(400, "Description is too long").optional(),
    amount: duesAmountSchema,
    frequency: z.enum(DUES_FREQUENCIES),
    customFrequency: z
      .object({
        label: z.string().trim().min(1, "Give the frequency a name"),
        days: z.number().int().positive("Enter the number of days").max(365, "Interval is too long"),
      })
      .optional(),
    startDate: z.string().min(10, "Choose a start date"),
    endDate: z.string().optional(),
    scope: z.enum(DUES_SCOPES),
    groupId: z.string().optional(),
    branchId: z.string().optional(),
    memberIds: z.array(z.string()).optional(),
    lien: duesLienRulesSchema,
    /** Resolved by the caller from the scope, so an empty audience is caught before it is saved. */
    rosterCount: z.number().int().min(0),
  })
  .superRefine((value, ctx) => {
    if (value.frequency === "Custom" && !value.customFrequency) {
      ctx.addIssue({
        code: "custom",
        path: ["customFrequency"],
        message: "Enter how often a custom plan falls due.",
      })
    }
    if (value.endDate && value.endDate < value.startDate) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "The end date cannot be before the start date.",
      })
    }
    if (value.scope === "Group" && !value.groupId) {
      ctx.addIssue({
        code: "custom",
        path: ["groupId"],
        message: "Choose the group this plan covers.",
      })
    }
    if (value.scope === "Branch" && !value.branchId) {
      ctx.addIssue({
        code: "custom",
        path: ["branchId"],
        message: "Choose the branch this plan covers.",
      })
    }
    if (value.scope === "Selected" && (value.memberIds ?? []).length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["memberIds"],
        message: "Choose at least one member.",
      })
    }
    if (value.rosterCount === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["rosterCount"],
        message: "This plan would cover nobody yet.",
      })
    }
  })
export type CreateDuesPlanValues = z.input<typeof createDuesPlanSchema>
export function firstError(result: { success: boolean; error?: z.ZodError }): string | null {
  return result.success ? null : (result.error?.issues[0]?.message ?? "Invalid input")
}
