import { apiClient, endpoints } from "@/services/api"
import type {
  CreateMemberInput,
  Member,
  MemberDTO,
  MemberImportResult,
  UpdateMemberInput,
} from "@/types"
import type { MemberRepository } from "./members.repository"

function mapMember(dto: MemberDTO): Member {
  return {
    id: dto.member_id,
    name: dto.full_name,
    phone: dto.phone_number,
    email: dto.email_address,
    group: dto.primary_group,
    branchId: dto.branch_id,
    branchName: dto.branch_name,
    status: dto.membership_status as Member["status"],
    accountStatus: dto.account_status as Member["accountStatus"],
    joinedAt: dto.joined_at,
    initials: dto.full_name
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join(""),
  }
}

export class ApiMemberRepository implements MemberRepository {
  async getAll(organizationId: string): Promise<Member[]> {
    const response = await apiClient.get<{ items: MemberDTO[] }>(
      endpoints.members.list(organizationId),
    )
    return response.items.map(mapMember)
  }

  async getById(organizationId: string, memberId: string): Promise<Member> {
    return mapMember(
      await apiClient.get<MemberDTO>(
        endpoints.members.detail(organizationId, memberId),
      ),
    )
  }

  async create(
    organizationId: string,
    input: CreateMemberInput,
  ): Promise<Member> {
    return mapMember(
      await apiClient.post<MemberDTO>(
        endpoints.members.list(organizationId),
        input,
      ),
    )
  }

  async update(
    organizationId: string,
    memberId: string,
    input: UpdateMemberInput,
  ): Promise<Member> {
    return mapMember(
      await apiClient.patch<MemberDTO>(
        endpoints.members.detail(organizationId, memberId),
        input,
      ),
    )
  }

  async delete(organizationId: string, memberId: string): Promise<void> {
    await apiClient.delete(endpoints.members.detail(organizationId, memberId))
  }

  async import(
    organizationId: string,
    file: File,
  ): Promise<MemberImportResult> {
    return apiClient.post(endpoints.members.import(organizationId), {
      fileName: file.name,
    })
  }

  subscribe(): () => void {
    // A real implementation would subscribe to a websocket or poll for invalidation.
    return () => {}
  }
}
