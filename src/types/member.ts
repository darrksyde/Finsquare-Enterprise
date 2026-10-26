import type { EntityId } from "./common"

export const MEMBER_STATUSES = [
  "Active",
  "Pending",
  "Suspended",
  "Inactive",
] as const
export const ACCOUNT_STATUSES = ["Not created", "Created", "Activated"] as const

export type MemberStatus = typeof MEMBER_STATUSES[number]
export type MemberAccountStatus = typeof ACCOUNT_STATUSES[number]

export interface Member {
  id: EntityId
  name: string
  phone: string
  email?: string
  gender?: "Female" | "Male" | "Other" | "Prefer not to say"
  address?: string
  nin?: string
  bvn?: string
  group: string
  branchId?: EntityId
  branchName?: string
  status: MemberStatus
  accountStatus: MemberAccountStatus
  joinedAt: string
  initials: string
}

export interface MemberDTO {
  member_id: string
  full_name: string
  phone_number: string
  email_address?: string
  primary_group: string
  branch_id?: string
  branch_name?: string
  membership_status: string
  account_status: string
  joined_at: string
}

export interface CreateMemberInput {
  name: string
  phone: string
  email?: string
  gender?: Member["gender"]
  address?: string
  nin?: string
  bvn?: string
  branchId?: EntityId
  groupIds: EntityId[]
  /** Display names resolved from the groups/branches stores, persisted additively by the API backend. */
  groupName?: string
  branchName?: string
  /** A member created from an approved application is active from the outset. */
  status?: MemberStatus
}

export type UpdateMemberInput = Partial<CreateMemberInput> & {
  status?: MemberStatus
}

export interface MemberImportError {
  row: number
  message: string
}

export interface MemberImportResult {
  imported: number
  skipped: number
  errors: MemberImportError[]
}
