import type { Administrator, InviteAdministratorInput } from "@/types"

export interface AdministratorDTO {
  id: string
  organization_id: string
  user_id: string
  name: string
  email: string
  phone?: string
  role_ids: string[]
  status: Administrator["status"]
  access_scope: Administrator["accessScope"]
  last_active_at?: string | null
  invited_at?: string | null
  created_at: string
  updated_at: string
}

export function mapApiAdministratorToAdministrator(
  dto: AdministratorDTO,
): Administrator {
  return {
    id: dto.id,
    organizationId: dto.organization_id,
    userId: dto.user_id,
    name: dto.name,
    email: dto.email,
    phone: dto.phone,
    roleIds: dto.role_ids,
    status: dto.status,
    accessScope: dto.access_scope,
    lastActiveAt: dto.last_active_at,
    invitedAt: dto.invited_at,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  }
}

export function mapAdministratorInviteToRequest(
  input: InviteAdministratorInput,
) {
  return {
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email,
    phone: input.phone,
    role_ids: input.roleIds,
    access_scope: input.accessScope,
  }
}
