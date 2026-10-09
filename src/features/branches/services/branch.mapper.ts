import type { Branch, CreateBranchInput } from "@/types"

export interface BranchDTO {
  id: string
  organization_id: string
  name: string
  code?: string
  description?: string
  parent_branch_id?: string | null
  status: Branch["status"]
  address?: Branch["address"]
  phone?: string
  email?: string
  member_count: number
  group_count: number
  administrator_count: number
  created_at: string
  updated_at: string
}

export function mapApiBranchToBranch(dto: BranchDTO): Branch {
  return {
    id: dto.id,
    organizationId: dto.organization_id,
    name: dto.name,
    code: dto.code,
    description: dto.description,
    parentBranchId: dto.parent_branch_id,
    status: dto.status,
    address: dto.address,
    phone: dto.phone,
    email: dto.email,
    memberCount: dto.member_count,
    groupCount: dto.group_count,
    administratorCount: dto.administrator_count,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  }
}

export function mapBranchToCreateRequest(input: CreateBranchInput) {
  return {
    name: input.name,
    code: input.code,
    description: input.description,
    parent_branch_id: input.parentBranchId,
    status: input.status,
    address: input.address,
    phone: input.phone,
    email: input.email,
    administrator_ids: input.administratorIds,
  }
}
