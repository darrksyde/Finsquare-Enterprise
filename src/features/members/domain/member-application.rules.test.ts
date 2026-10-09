import { describe, expect, it } from "vitest"
import { customStep, qf } from "@/features/forms/domain/forms"
import {
  applicantEmail,
  applicantName,
  applicantPhone,
  applicationLinkLive,
  approveApplication,
  markUnderReview,
  memberSystemSteps,
  newMemberApplicationForm,
  rejectApplication,
  slugify,
  submittedStatus,
  toCreateMemberInput,
} from "./member-application.rules"
import type { MemberApplication } from "../types/member-application.types"

const publishedForm = (overrides: Partial<ReturnType<typeof newMemberApplicationForm>> = {}) => {
  const form = newMemberApplicationForm("Member application", "group-executive")
  const version = form.versions[0]
  return { ...form, status: "Published" as const, publishedVersionId: version.id, versions: [{ ...version, status: "Published" as const }], ...overrides }
}

const application = (overrides: Partial<MemberApplication> = {}): MemberApplication => ({
  id: "ma-1", reference: "MA-0001", formId: "maf-1", formName: "Member application", versionId: "fv-1", versionNumber: 1,
  submittedAt: "2026-01-01", status: "Submitted", values: {}, source: "Public link", ...overrides,
})

describe("member application form", () => {
  it("locks the fields a member cannot exist without", () => {
    const fields = memberSystemSteps().flatMap((step) => step.fields)
    const locked = fields.filter((field) => field.locked).map((field) => field.systemField)
    expect(locked).toEqual(["fullName", "phone"])
    expect(fields.find((field) => field.systemField === "fullName")?.required).toBe(true)
    expect(fields.find((field) => field.systemField === "phone")?.type).toBe("phone")
  })

  it("includes the optional identity fields an organization may ask for", () => {
    const fields = memberSystemSteps().flatMap((step) => step.fields)
    expect(fields.filter((field) => field.required).map((field) => field.systemField)).toEqual(["fullName", "phone"])
    expect(fields.map((field) => field.systemField)).toEqual(["fullName", "phone", "email", "gender", "address", "nin", "bvn"])
  })

  it("puts custom steps before the documents and review steps", () => {
    const steps = memberSystemSteps({ custom: [customStep("Farming", [qf("Farm size", "number")])] })
    expect(steps.map((step) => step.title)).toEqual(["Your details", "Farming", "Documents", "Review & Submit"])
    expect(steps.map((step) => step.order)).toEqual([0, 1, 2, 3])
  })

  it("has no loan or guarantor step, because a member application is not a credit application", () => {
    const kinds = memberSystemSteps().map((step) => step.kind)
    expect(kinds).not.toContain("loan")
    expect(kinds).not.toContain("guarantors")
  })

  it("starts as a draft with approval required and a live link", () => {
    const form = newMemberApplicationForm("Farmers onboarding", "group-executive")
    expect(form.name).toBe("Farmers onboarding")
    expect(form.slug).toBe("farmers-onboarding")
    expect(form.status).toBe("Draft")
    expect(form.joinMode).toBe("Approval")
    expect(form.linkEnabled).toBe(true)
    expect(form.versions).toHaveLength(1)
    expect(form.submissions).toBe(0)
  })

  it("falls back to a usable name and slug", () => {
    expect(newMemberApplicationForm("   ", "group-executive").name).toBe("Member application form")
    expect(newMemberApplicationForm("   ", "group-executive").slug).toBe("member-application-form")
    expect(slugify("Bode Thomas SMEs!")).toBe("bode-thomas-smes")
  })
})

describe("application link", () => {
  it("is only live for a published form with the link switched on", () => {
    expect(applicationLinkLive(newMemberApplicationForm("Form", "g"))).toBe(false)
    expect(applicationLinkLive(publishedForm())).toBe(true)
    expect(applicationLinkLive(publishedForm({ linkEnabled: false }))).toBe(false)
    expect(applicationLinkLive(publishedForm({ status: "Archived", linkEnabled: true }))).toBe(false)
    expect(applicationLinkLive(undefined)).toBe(false)
  })
})

describe("joining", () => {
  it("open joining decides on submit; approval leaves it to an administrator", () => {
    expect(submittedStatus("Open")).toBe("Approved")
    expect(submittedStatus("Approval")).toBe("Submitted")
  })
})

describe("creating a member from an application", () => {
  const values = {
    "sys-fullName": "  Grace Williams  ", "sys-phone": "+234 803 214 7780", "sys-email": "grace@example.demo",
    "sys-gender": "Female", "sys-address": "12 Market Road", "sys-nin": "12345678901", "sys-bvn": "98765432109",
  }

  it("carries every answered field onto the member record", () => {
    expect(toCreateMemberInput(values, "group-executive")).toEqual({
      name: "Grace Williams", phone: "+234 803 214 7780", email: "grace@example.demo", gender: "Female",
      address: "12 Market Road", nin: "12345678901", bvn: "98765432109", groupIds: ["group-executive"], status: "Active",
    })
  })

  it("leaves blank optional answers off the record rather than sending empty strings", () => {
    const input = toCreateMemberInput({ "sys-fullName": "Grace Williams", "sys-phone": "+2348032147780", "sys-email": "  " }, "group-executive")
    expect(input.email).toBeUndefined()
    expect(input.address).toBeUndefined()
    expect(input.gender).toBeUndefined()
  })

  it("refuses an application with no name or no phone", () => {
    expect(() => toCreateMemberInput({ "sys-phone": "+2348032147780" }, "g")).toThrow("no full name")
    expect(() => toCreateMemberInput({ "sys-fullName": "Grace Williams" }, "g")).toThrow("no phone number")
  })

  it("reads the applicant details used in the applications list", () => {
    expect(applicantName(values)).toBe("Grace Williams")
    expect(applicantPhone(values)).toBe("+234 803 214 7780")
    expect(applicantEmail(values)).toBe("grace@example.demo")
    expect(applicantName({})).toBe("—")
  })
})

describe("review decisions", () => {
  it("approving records the member it created and who decided", () => {
    const approved = approveApplication(application(), "LFC-002500", "Admin User")
    expect(approved.status).toBe("Approved")
    expect(approved.memberId).toBe("LFC-002500")
    expect(approved.reviewer).toBe("Admin User")
    expect(approved.decidedAt).toBeTruthy()
  })

  it("rejecting requires a reason", () => {
    expect(() => rejectApplication(application(), "   ", "Admin User")).toThrow("Give a reason")
    const rejected = rejectApplication(application(), "Duplicate application", "Admin User")
    expect(rejected.status).toBe("Rejected")
    expect(rejected.rejectionReason).toBe("Duplicate application")
    expect(rejected.memberId).toBeUndefined()
  })

  it("cannot decide the same application twice", () => {
    const approved = approveApplication(application(), "LFC-002500", "Admin User")
    expect(() => approveApplication(approved, "LFC-002501", "Admin User")).toThrow("already been decided")
    expect(() => rejectApplication(approved, "Changed my mind", "Admin User")).toThrow("already been decided")
    expect(() => rejectApplication(application({ status: "Rejected" }), "Again", "Admin User")).toThrow("already been decided")
  })

  it("marking under review only moves a fresh submission", () => {
    expect(markUnderReview(application()).status).toBe("Under Review")
    expect(markUnderReview(application({ status: "Under Review" })).status).toBe("Under Review")
    expect(markUnderReview(application({ status: "Approved" })).status).toBe("Approved")
  })
})
