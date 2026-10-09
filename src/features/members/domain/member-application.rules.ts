import { mockId, newVersion, publishedVersion, renumber, str, systemField as f, systemStep as step } from "@/features/forms/domain/forms"
import type { FormField, FormResponseValue, FormStep } from "@/features/forms/types/form.types"
import type { CreateMemberInput } from "@/types"
import type { MemberApplication, MemberApplicationForm, MemberApplicationStatus, MemberJoinMode } from "../types/member-application.types"

const today = () => new Date().toISOString().slice(0, 10)

/**
 * The member record FinSquare must be able to create. Full name and phone number are locked —
 * the builder cannot remove them or make them optional — because no member can exist without them.
 * Everything else is included, optional, and removable per organization.
 */
export function memberSystemSteps(extra: { custom?: FormStep[]; docs?: FormField[] } = {}): FormStep[] {
  return renumber([
    step("personal", "Your details", [
      f("fullName", "Full name", "short_text", true, true),
      f("phone", "Phone number", "phone", true, true),
      f("email", "Email", "email", false),
      f("gender", "Gender", "dropdown", false, false, ["Female", "Male", "Other", "Prefer not to say"]),
      f("address", "Residential address", "address", false),
      f("nin", "NIN", "short_text", false),
      f("bvn", "BVN", "short_text", false),
    ], "The details FinSquare needs to open a member record."),
    ...(extra.custom ?? []),
    step("documents", "Documents", extra.docs ?? [], "Upload any documents this organization asks for."),
    step("review", "Review & Submit", []),
  ])
}

export const slugify = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")

export function newMemberApplicationForm(name: string, groupId: string): MemberApplicationForm {
  const title = name.trim() || "Member application form"
  return {
    id: mockId("maf"),
    name: title,
    slug: slugify(title),
    joinMode: "Approval",
    groupId,
    linkEnabled: true,
    status: "Draft",
    versions: [newVersion(1, "Draft", memberSystemSteps())],
    submissions: 0,
    createdAt: today(),
  }
}

/**
 * The link only works while the form is published, the administrator has left the link switched on
 * and there is a live version to render.
 */
export const applicationLinkLive = (form?: MemberApplicationForm): boolean =>
  !!form && form.status === "Published" && form.linkEnabled && !!publishedVersion(form)

/** Open joining decides the moment someone submits; approval leaves it to an administrator. */
export const submittedStatus = (joinMode: MemberJoinMode): MemberApplicationStatus =>
  joinMode === "Open" ? "Approved" : "Submitted"

export const applicantName = (values: Record<string, FormResponseValue>) => str(values["sys-fullName"]).trim() || "—"
export const applicantPhone = (values: Record<string, FormResponseValue>) => str(values["sys-phone"]).trim() || "—"
export const applicantEmail = (values: Record<string, FormResponseValue>) => str(values["sys-email"]).trim() || "—"

/** Turns submitted answers into the member record the member service needs. */
export function toCreateMemberInput(values: Record<string, FormResponseValue>, groupId: string): CreateMemberInput {
  const name = str(values["sys-fullName"]).trim()
  const phone = str(values["sys-phone"]).trim()
  if (!name) throw new Error("This application has no full name.")
  if (!phone) throw new Error("This application has no phone number.")
  const email = str(values["sys-email"]).trim()
  const gender = str(values["sys-gender"]).trim()
  return {
    name,
    phone,
    email: email || undefined,
    gender: (gender || undefined) as CreateMemberInput["gender"],
    address: str(values["sys-address"]).trim() || undefined,
    nin: str(values["sys-nin"]).trim() || undefined,
    bvn: str(values["sys-bvn"]).trim() || undefined,
    groupIds: [groupId],
    status: "Active",
  }
}

const decide = (application: MemberApplication, status: MemberApplicationStatus, reviewer: string) => {
  if (application.status === "Approved" || application.status === "Rejected") {
    throw new Error("This application has already been decided.")
  }
  return { ...application, status, reviewer, decidedAt: today() }
}

/** Approving creates the member, so the application records which member it produced. */
export const approveApplication = (application: MemberApplication, memberId: string, reviewer: string): MemberApplication => ({
  ...decide(application, "Approved", reviewer),
  memberId,
  rejectionReason: undefined,
})

export function rejectApplication(application: MemberApplication, reason: string, reviewer: string): MemberApplication {
  const trimmed = reason.trim()
  if (!trimmed) throw new Error("Give a reason for rejecting this application.")
  return { ...decide(application, "Rejected", reviewer), rejectionReason: trimmed, memberId: undefined }
}

export const markUnderReview = (application: MemberApplication): MemberApplication =>
  application.status === "Submitted" ? { ...application, status: "Under Review" } : application
