import { customStep, doc, newVersion, qf } from "@/features/forms/domain/forms"
import type { FormResponseValue, FormVersion } from "@/features/forms/types/form.types"
import { memberSystemSteps } from "../domain/member-application.rules"
import type { MemberApplication, MemberApplicationDataset, MemberApplicationForm } from "../types/member-application.types"

const today = () => new Date().toISOString().slice(0, 10)
const GROUP = "group-ikeja-savings"

const occupationField = qf("Occupation", "short_text")
const kinField = qf("Next of kin full name", "short_text")
const idDocument = doc("National ID", true, "A clear copy of any government-issued photo ID.")

/** The custom half of the seeded form, so the seeded answers line up with the seeded fields. */
const customSteps = [customStep("About you", [occupationField, kinField])]

const answers = (input: { name: string; phone: string; email: string; gender: string; address: string; occupation: string; nextOfKin: string }): Record<string, FormResponseValue> => ({
  "sys-fullName": input.name,
  "sys-phone": input.phone,
  "sys-email": input.email,
  "sys-gender": input.gender,
  "sys-address": input.address,
  "sys-nin": "",
  "sys-bvn": "",
  [occupationField.id]: input.occupation,
  [kinField.id]: input.nextOfKin,
  [idDocument.id]: { fileName: "national-id.pdf", uploadedAt: today() },
})

const APPLICANTS = [
  { name: "Blessing Okafor", phone: "+234 806 214 0091", email: "blessing.o@example.demo", gender: "Female", address: "4 Adeniyi Jones, Ikeja", occupation: "Trader", nextOfKin: "Nnamdi Okafor" },
  { name: "Ibrahim Suleiman", phone: "+234 703 918 4471", email: "ibrahim.s@example.demo", gender: "Male", address: "22 Awolowo Way, Ikeja", occupation: "Poultry farmer", nextOfKin: "Aisha Suleiman" },
  { name: "Chiamaka Nwosu", phone: "+234 815 336 2210", email: "chiamaka.n@example.demo", gender: "Female", address: "9 Ogba Road, Ikeja", occupation: "Tailor", nextOfKin: "Emeka Nwosu" },
  { name: "Yusuf Bello", phone: "+234 809 442 8817", email: "yusuf.b@example.demo", gender: "Male", address: "31 Allen Avenue, Ikeja", occupation: "Transport operator", nextOfKin: "Halima Bello" },
  { name: "Funmilayo Ade", phone: "+234 802 771 3390", email: "funmilayo.a@example.demo", gender: "Female", address: "6 Opebi Road, Ikeja", occupation: "Food vendor", nextOfKin: "Segun Ade" },
]

const STATUSES = ["Submitted", "Under Review", "Approved", "Rejected", "Submitted"] as const

export function createMemberApplicationDataset(): MemberApplicationDataset {
  const published: FormVersion = {
    ...newVersion(1, "Published", memberSystemSteps({ custom: customSteps, docs: [idDocument] })),
    id: "fv-member-1", createdAt: "2026-01-06", publishedAt: "2026-01-06",
  }
  const onboarding: MemberApplicationForm = {
    id: "maf-onboarding", name: "Member onboarding", slug: "member-onboarding", joinMode: "Approval", groupId: GROUP,
    linkEnabled: true, status: "Published", publishedVersionId: published.id, versions: [published], submissions: APPLICANTS.length, createdAt: "2026-01-06",
  }
  const draft: FormVersion = { ...newVersion(1, "Draft", memberSystemSteps({ custom: customSteps })), id: "fv-member-2", createdAt: "2026-02-02" }
  const enrolment: MemberApplicationForm = {
    id: "maf-enrolment", name: "Savings group enrolment", slug: "savings-group-enrolment", joinMode: "Open", groupId: GROUP,
    linkEnabled: false, status: "Draft", versions: [draft], submissions: 0, createdAt: "2026-02-02",
  }

  const applications: MemberApplication[] = APPLICANTS.map((applicant, index) => {
    const status = STATUSES[index]
    const decided = status === "Approved" || status === "Rejected"
    return {
      id: `ma-${index + 1}`,
      reference: `MA-${String(index + 1).padStart(4, "0")}`,
      formId: onboarding.id,
      formName: onboarding.name,
      versionId: published.id,
      versionNumber: published.version,
      submittedAt: `2026-02-${String(10 + index).padStart(2, "0")}`,
      status,
      values: answers(applicant),
      source: index === 4 ? "Recorded by staff" : "Public link",
      memberId: status === "Approved" ? "LFC-002481" : undefined,
      reviewer: decided ? "Admin User" : undefined,
      decidedAt: decided ? "2026-02-20" : undefined,
      rejectionReason: status === "Rejected" ? "Already has a member record under another phone number." : undefined,
    }
  })

  return { forms: [onboarding, enrolment], applications }
}
