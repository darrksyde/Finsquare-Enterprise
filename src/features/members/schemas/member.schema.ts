import { z } from "zod"

export const memberSchema = z.object({
  name: z.string().trim().min(2, "Enter the member’s full name."),
  phone: z.string().trim().min(10, "Enter a valid phone number."),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .optional()
    .or(z.literal("")),
  branchId: z.string().optional(),
  groupIds: z.array(z.string()).min(1, "Select at least one group."),
})

export type MemberFormValues = z.infer<typeof memberSchema>
