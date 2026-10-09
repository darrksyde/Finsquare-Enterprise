import type { EntityId } from "./common"

export const BRANCH_STATUSES = ["active", "inactive", "archived"] as const
export type BranchStatus = typeof BRANCH_STATUSES[number]

export interface Address {
  line1?: string
  line2?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
}

export interface Branch {
  id: EntityId
  organizationId: EntityId
  name: string
  code?: string
  description?: string
  parentBranchId?: EntityId | null
  status: BranchStatus
  address?: Address
  phone?: string
  email?: string
  memberCount: number
  groupCount: number
  administratorCount: number
  createdAt: string
  updatedAt: string
}

export interface CreateBranchInput {
  name: string
  code?: string
  description?: string
  parentBranchId?: EntityId | null
  status: BranchStatus
  address?: Address
  phone?: string
  email?: string
  administratorIds?: EntityId[]
}

export type UpdateBranchInput = Partial<CreateBranchInput>
