import { z } from "zod"

export const administratorInvitationSchema = z
  .object({
    firstName: z.string().trim().min(2, "Enter a first name."),
    lastName: z.string().trim().min(2, "Enter a last name."),
    email: z.string().trim().email("Enter a valid email."),
    phone: z.string().trim().optional(),
    roleIds: z.array(z.string()).min(1, "Select at least one role."),
    scopeType: z.enum(["organization", "branch"]),
    branchIds: z.array(z.string()),
  })
  .superRefine((value, context) => {
    if (value.scopeType === "branch" && value.branchIds.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["branchIds"],
        message: "Select at least one branch for branch-scoped access.",
      })
    }
  })

export type AdministratorInvitationValues = z.infer<typeof administratorInvitationSchema>
