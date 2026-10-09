import { z } from "zod"

/** The two things an administrator names when creating an application form. */
export const memberApplicationFormSchema = z.object({
  name: z.string().trim().min(2, "Give the form a name."),
  groupId: z.string().trim().min(1, "Choose the group new members join."),
})

export type MemberApplicationFormValues = z.infer<typeof memberApplicationFormSchema>

/** A rejection has to say why, because the applicant is not told and the record is all there is. */
export const applicationDecisionSchema = z.object({
  reason: z.string().trim().min(3, "Give a reason for rejecting this application."),
})

export type ApplicationDecisionValues = z.infer<typeof applicationDecisionSchema>

/** Joining settings applied when a form is published. */
export const joinSettingsSchema = z.object({
  joinMode: z.enum(["Open", "Approval"]),
  groupId: z.string().trim().min(1, "Choose the group new members join."),
  linkEnabled: z.boolean(),
})

export type JoinSettingsValues = z.infer<typeof joinSettingsSchema>
