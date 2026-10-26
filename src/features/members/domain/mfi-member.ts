import type { Member } from "@/types"
import { formatJoinedDate } from "./member-import"

/**
 * The MFI backend's customer DTOs, as returned by `/customers` and `/customers/:userId`.
 * The list omits the profile-only fields (gender/address/state/lga/city) that the detail returns.
 */
export interface MfiCustomerListItem {
  membershipId?: string
  joinedAt?: string | null
  id: string
  fullName?: string | null
  email?: string | null
  phoneNumber?: string | null
  walletTier?: string | null
  bvn?: string | null
  nin?: string | null
  createdAt?: string | null
  isBanned?: boolean
  /** Additive Enterprise placement data stored in `membership.mfiMeta`. */
  mfiMeta?: {
    groupName?: string
    branchName?: string
    groupId?: string
    branchId?: string
    [key: string]: unknown
  } | null
}

export interface MfiCustomerDetail extends MfiCustomerListItem {
  firstName?: string | null
  lastName?: string | null
  gender?: string | null
  address?: string | null
  state?: string | null
  lga?: string | null
  city?: string | null
  virtualAccountNumber?: string | null
}

/** Normalises the backend's free-form gender string onto the member domain's union. */
export function genderToMember(gender: unknown): Member["gender"] {
  if (typeof gender !== "string") return undefined
  const value = gender.trim().toLowerCase()
  if (value === "female" || value === "f") return "Female"
  if (value === "male" || value === "m") return "Male"
  if (value === "other") return "Other"
  if (value === "prefer not to say") return "Prefer not to say"
  return undefined
}

/** Maps the member domain's gender back onto the backend enum the MFI API accepts. */
export function genderToMfi(gender: Member["gender"]): string | undefined {
  if (gender === "Female") return "FEMALE"
  if (gender === "Male") return "MALE"
  if (gender === "Other") return "OTHER"
  return undefined
}

/** The MFI backend stores `firstName`/`lastName`; the member form collects one full name. */
export function splitFullName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") }
}

function initialsOf(fullName: string): string {
  return fullName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
}

interface CustomerFields {
  id: string
  fullName?: string | null
  email?: string | null
  phoneNumber?: string | null
  gender?: string | null
  address?: string | null
  bvn?: string | null
  nin?: string | null
  walletTier?: string | null
  isBanned?: boolean
  virtualAccountNumber?: string | null
  joinedAt?: string | null
  createdAt?: string | null
  mfiMeta?: MfiCustomerListItem["mfiMeta"]
}

/**
 * Common mapping for every customer DTO. Status and account status are derived because the MFI
 * backend models them as `isBanned` + `walletTier` / `virtualAccountNumber` rather than as
 * explicit enums. Group and branch come from the additive `mfiMeta` placement fields.
 */
export function mapCustomerFields(fields: CustomerFields): Member {
  const fullName = fields.fullName ?? ""
  return {
    id: fields.id,
    name: fullName,
    phone: fields.phoneNumber ?? "",
    email: fields.email || undefined,
    gender: genderToMember(fields.gender),
    address: fields.address || undefined,
    nin: fields.nin || undefined,
    bvn: fields.bvn || undefined,
    group: fields.mfiMeta?.groupName || "Unassigned",
    branchId: fields.mfiMeta?.branchId || undefined,
    branchName: fields.mfiMeta?.branchName || undefined,
    status: fields.isBanned ? "Suspended" : "Active",
    accountStatus: fields.virtualAccountNumber
      ? "Activated"
      : fields.walletTier
        ? "Created"
        : "Not created",
    joinedAt: formatJoinedDate(fields.joinedAt ?? "", fields.createdAt ? new Date(fields.createdAt) : new Date()),
    initials: initialsOf(fullName),
  }
}
