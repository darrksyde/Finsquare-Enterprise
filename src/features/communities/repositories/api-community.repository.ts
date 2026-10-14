import { apiClient, endpoints } from "@/services/api"
import type { CommunityMembership, CreateCommunityInput } from "../types"
import type { CommunityRepository } from "./community.repository"

/** Backend response shape; mapped to the domain membership here so DTOs never reach the UI. */
interface CommunityDTO {
  organization_id: string
  name: string
  type: string
  country: string
  legal_name?: string | null
  primary_color?: string | null
  logo_url?: string | null
  role_id: string
  role_name: string
  scope: "organization" | "branch"
  branch_ids?: string[]
  is_owner: boolean
}

function mapMembership(dto: CommunityDTO): CommunityMembership {
  return {
    organizationId: dto.organization_id,
    name: dto.name,
    type: dto.type,
    country: dto.country,
    logo: dto.logo_url ?? "",
    legalName: dto.legal_name ?? "",
    accent: dto.primary_color ?? "blue",
    roleId: dto.role_id,
    roleName: dto.role_name,
    scope: dto.scope,
    branchIds: dto.branch_ids,
    isOwner: dto.is_owner,
  }
}

/**
 * API-backed repository. The backend resolves the communities from the authenticated session — a
 * client-supplied identity here would be a way to ask for someone else's — and creating one must make
 * the caller its owner in the same transaction that creates the tenant.
 */
export class ApiCommunityRepository implements CommunityRepository {
  async list(): Promise<CommunityMembership[]> {
    const response = await apiClient.get<{ items: CommunityDTO[] }>(endpoints.organizations.list)
    return response.items.map(mapMembership)
  }

  async create(input: CreateCommunityInput): Promise<CommunityMembership> {
    return mapMembership(
      await apiClient.post<CommunityDTO>(endpoints.organizations.create, {
        name: input.name,
        type: input.type,
        legal_name: input.legalName,
        country: input.country,
        logo_url: input.logo || null,
        primary_color: input.accent,
      }),
    )
  }
}
