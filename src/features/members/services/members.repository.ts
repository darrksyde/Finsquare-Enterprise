import type {
  CreateMemberInput,
  Member,
  MemberImportResult,
  UpdateMemberInput,
} from "@/types"
import type { ImportTarget } from "../domain/member-import"

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
  /**
   * Reads a CSV upload and creates the member records it can. `mapping` overrides the columns
   * detected from the header row. The backend must re-validate every row and return the same
   * per-row outcome rather than a single pass/fail.
   */
  import(organizationId: string, file: File, mapping?: ImportTarget[]): Promise<MemberImportResult>
  /** Lets open pages refresh when a member is created from an application or added by hand. */
  subscribe(listener: () => void): () => void
}
