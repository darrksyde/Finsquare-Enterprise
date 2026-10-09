import { z } from "zod"
import type { Branch } from "@/types"

export const branchSchema = z.object({
  name: z.string().trim().min(2, "Enter a branch name."),
  code: z.string().trim().max(20, "Use 20 characters or fewer.").optional(),
  description: z.string().trim().max(500).optional(),
  parentBranchId: z.string().nullable().optional(),
  status: z.enum(["active", "inactive", "archived"]),
  phone: z.string().trim().optional(),
  email: z
    .string()
    .trim()
    .email("Enter a valid email.")
    .optional()
    .or(z.literal("")),
  address: z
    .object({
      line1: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
  administratorIds: z.array(z.string()).optional(),
})

export type BranchFormValues = z.infer<typeof branchSchema>

export function wouldCreateBranchCycle(
  branchId: string,
  proposedParentId: string | null | undefined,
  branches: Branch[],
): boolean {
  if (!proposedParentId) return false
  if (branchId === proposedParentId) return true

  let current: string | null | undefined = proposedParentId
  const visited = new Set<string>()
  while (current) {
    if (current === branchId) return true
    if (visited.has(current)) return true
    visited.add(current)
    current = branches.find((branch) => branch.id === current)?.parentBranchId
  }
  return false
}
