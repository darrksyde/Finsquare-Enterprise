import { groupsMock } from "@/features/groups/mocks/groups.mock"
import { membersMock } from "../mocks/members.mock"
import { defaultMapping, formatJoinedDate, parseCsv, type ImportTarget } from "../domain/member-import"
import type {
  CreateMemberInput,
  Member,
  MemberImportError,
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

/**
 * Members are numbered above the highest record already present. Counting `records.length` instead
 * would reissue an id after a delete, and would hand the same id to every record in an import.
 */
let nextSequence = records.reduce(
  (highest, member) => Math.max(highest, Number(member.id.replace(/\D/g, "")) || 0),
  0,
)
const nextId = () => `LFC-${String((nextSequence += 1)).padStart(6, "0")}`

const buildMember = (input: CreateMemberInput, joinedAt?: string): Member => ({
  id: nextId(),
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
  // `joinedAt` is a display string in this register, so a raw ISO timestamp must not be written here.
  joinedAt: joinedAt ?? formatJoinedDate("", new Date()),
  initials: input.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join(""),
})

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
    const member = buildMember(input)
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

  /**
   * Reads the upload and creates every record it can. A member cannot exist without a full name and
   * a phone number, so rows missing either are skipped and reported per row — the same shape a
   * backend would return, which is why the caller never has to guess what happened.
   */
  async import(
    _organizationId: string,
    file: File,
    mapping?: ImportTarget[],
  ): Promise<MemberImportResult> {
    const table = parseCsv(await file.text())
    const columns = mapping?.length === table.headers.length ? mapping : defaultMapping(table.headers)
    const column = (row: string[], target: ImportTarget) => {
      const index = columns.indexOf(target)
      return index >= 0 ? (row[index] ?? "").trim() : ""
    }

    const errors: MemberImportError[] = []
    const created: Member[] = []

    table.rows.forEach((row, index) => {
      const name = column(row, "Full name")
      const phone = column(row, "Phone")
      if (!name || !phone) {
        // Row numbers count the header, so they line up with what the spreadsheet shows.
        errors.push({ row: index + 2, message: !name ? "Full name is missing" : "Phone number is missing" })
        return
      }
      created.push(
        buildMember(
          {
            name,
            phone,
            email: column(row, "Email") || undefined,
            groupIds: [],
            status: "Active",
          },
          formatJoinedDate(column(row, "Date joined"), new Date()),
        ),
      )
    })

    if (created.length) {
      records = [...created, ...records]
      notify()
    }

    return { imported: created.length, skipped: errors.length, errors }
  }

  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => void listeners.delete(listener)
  }
}
