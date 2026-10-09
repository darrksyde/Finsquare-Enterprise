import { z } from "zod"

export const groupSchema = z.object({
  name: z.string().trim().min(2, "Enter a group name."),
  code: z.string().trim().max(20, "Use 20 characters or fewer.").optional(),
  description: z.string().trim().max(500).optional(),
  typeId: z.string().min(1, "Select a group type."),
  branchId: z.string().nullable().optional(),
  parentGroupId: z.string().nullable().optional(),
  coordinatorMemberId: z.string().nullable().optional(),
  assistantCoordinatorMemberId: z.string().nullable().optional(),
  status: z.enum(["active", "inactive", "archived"]),
  allowJoinRequests: z.boolean(),
  coordinatorCanManageMembers: z.boolean(),
  visibility: z.enum(["organization", "members"]),
})

export type GroupFormValues = z.infer<typeof groupSchema>
