import { groupsMock } from "@/features/groups/mocks/groups.mock"
import { membersMock } from "../mocks/members.mock"
import type {
  CreateMemberInput,
  Member,
  MemberImportResult,
  UpdateMemberInput,
} from "@/types"
import type { MemberRepository } from "./members.repository"

let records = [...membersMock]
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

/** A new member lands in the group the application was configured with. */
const groupNameOf = (groupIds: string[]) =>
  groupsMock.find((group) => group.id === groupIds[0])?.name ?? "New members"

export class MockMemberRepository implements MemberRepository {
  async getAll(): Promise<Member[]> {
    return structuredClone(records)
  }

  async getById(
    _organizationId: string,
    memberId: string,
  ): Promise<Member | null> {
    return structuredClone(
      records.find((member) => member.id === memberId) ?? null,
    )
  }

  async create(
    _organizationId: string,
    input: CreateMemberInput,
  ): Promise<Member> {
    const member: Member = {
      id: `LFC-${String(records.length + 2430).padStart(6, "0")}`,
      name: input.name,
      phone: input.phone,
      email: input.email,
      gender: input.gender,
      address: input.address,
      nin: input.nin,
      bvn: input.bvn,
      group: groupNameOf(input.groupIds),
      branchId: input.branchId,
      status: input.status ?? "Pending",
      accountStatus: "Created",
      joinedAt: new Date().toISOString(),
      initials: input.name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join(""),
    }
    records = [member, ...records]
    notify()
    return structuredClone(member)
  }

  async update(
    _organizationId: string,
    memberId: string,
    input: UpdateMemberInput,
  ): Promise<Member> {
    const index = records.findIndex((member) => member.id === memberId)
    if (index < 0) throw new Error("Member not found.")
    records[index] = { ...records[index], ...input }
    notify()
    return structuredClone(records[index])
  }

  async delete(_organizationId: string, memberId: string): Promise<void> {
    records = records.filter((member) => member.id !== memberId)
    notify()
  }

  async import(): Promise<MemberImportResult> {
    return { imported: 2421, skipped: 17, errors: [] }
  }

  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => void listeners.delete(listener)
  }
}
