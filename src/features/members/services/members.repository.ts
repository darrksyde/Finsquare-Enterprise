import type {
  CreateMemberInput,
  Member,
  MemberImportResult,
  UpdateMemberInput,
} from "@/types"

export interface MemberRepository {
  getAll(organizationId: string): Promise<Member[]>
  getById(organizationId: string, memberId: string): Promise<Member | null>
  create(organizationId: string, input: CreateMemberInput): Promise<Member>
  update(
    organizationId: string,
    memberId: string,
    input: UpdateMemberInput,
  ): Promise<Member>
  delete(organizationId: string, memberId: string): Promise<void>
  import(organizationId: string, file: File): Promise<MemberImportResult>
  /** Lets open pages refresh when a member is created from an application or added by hand. */
  subscribe(listener: () => void): () => void
}
