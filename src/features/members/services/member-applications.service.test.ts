import { describe, expect, it } from "vitest"
import { MemberApplicationsService } from "./member-applications.service"
import { createMockMemberApplicationRepository } from "./mock-member-applications.repository"
import { createMemberApplicationDataset } from "../mocks/member-applications.mock"
import type { MemberApplication, MemberApplicationForm } from "../types/member-application.types"

const organizationId = "org-lagos-farmers"
const service = () => new MemberApplicationsService(createMockMemberApplicationRepository())

const seeded = () => {
  const dataset = createMemberApplicationDataset()
  const form = dataset.forms[0]
  const version = form.versions.find((v) => v.id === form.publishedVersionId)!
  return { form, version, applications: dataset.applications }
}

const openForm = (form: MemberApplicationForm): MemberApplicationForm => ({ ...form, joinMode: "Open", status: "Published", linkEnabled: true })

describe("member applications service", () => {
  it("loads the seeded forms and applications", async () => {
    const { forms, applications } = await service().load(organizationId)
    expect(forms).toHaveLength(2)
    expect(applications).toHaveLength(5)
    expect(applications.map((a) => a.status)).toContain("Approved")
    expect(applications.map((a) => a.status)).toContain("Rejected")
  })

  it("records an approval-required submission without creating a member", async () => {
    const api = service()
    const { form, version } = seeded()
    const application = await api.submit(organizationId, { form, version, values: { "sys-fullName": "Ada Nwosu", "sys-phone": "+2348000000000" }, source: "Public link" })
    expect(application.status).toBe("Submitted")
    expect(application.memberId).toBeUndefined()
    expect(application.reference).toMatch(/^MA-\d{4}$/)
    expect(application.versionId).toBe(version.id)
    expect((await api.load(organizationId)).applications[0].id).toBe(application.id)
  })

  it("open joining creates the member the moment someone submits", async () => {
    const api = service()
    const { form, version } = seeded()
    const application = await api.submit(organizationId, {
      form: openForm(form), version,
      values: { "sys-fullName": "Ada Nwosu", "sys-phone": "+2348000000000", "sys-email": "ada@example.demo" },
      source: "Public link",
    })
    expect(application.status).toBe("Approved")
    expect(application.memberId).toMatch(/^LFC-/)
    expect(application.reviewer).toBe("Automatic (open joining)")
  })

  it("counts submissions against the form", async () => {
    const api = service()
    const { form, version } = seeded()
    const before = form.submissions
    await api.submit(organizationId, { form, version, values: { "sys-fullName": "Ada Nwosu", "sys-phone": "+2348000000000" }, source: "Recorded by staff" })
    expect((await api.load(organizationId)).forms.find((f) => f.id === form.id)?.submissions).toBe(before + 1)
  })

  it("refuses a submission with no name or no phone", async () => {
    const api = service()
    const { form, version } = seeded()
    await expect(api.submit(organizationId, { form: openForm(form), version, values: { "sys-fullName": "Ada Nwosu" }, source: "Public link" })).rejects.toThrow("no phone number")
  })

  it("approving creates the member and links it to the application", async () => {
    const api = service()
    const { applications } = seeded()
    const pending = applications.find((a) => a.status === "Submitted") as MemberApplication
    const approved = await api.approve(organizationId, pending, "Admin User")
    expect(approved.status).toBe("Approved")
    expect(approved.memberId).toMatch(/^LFC-/)
    expect(approved.reviewer).toBe("Admin User")
    expect((await api.load(organizationId)).applications.find((a) => a.id === pending.id)?.memberId).toBe(approved.memberId)
  })

  it("rejecting stores the reason and creates nothing", async () => {
    const api = service()
    const { applications } = seeded()
    const pending = applications.find((a) => a.status === "Submitted") as MemberApplication
    const rejected = await api.reject(organizationId, pending, "Not eligible yet", "Admin User")
    expect(rejected.status).toBe("Rejected")
    expect(rejected.rejectionReason).toBe("Not eligible yet")
    expect(rejected.memberId).toBeUndefined()
  })

  it("will not decide the same application twice", async () => {
    const api = service()
    const { applications } = seeded()
    const decided = applications.find((a) => a.status === "Approved") as MemberApplication
    await expect(api.approve(organizationId, decided, "Admin User")).rejects.toThrow("already been decided")
  })

  it("moves a fresh submission to under review", async () => {
    const api = service()
    const { applications } = seeded()
    const pending = applications.find((a) => a.status === "Submitted") as MemberApplication
    await api.markUnderReview(organizationId, pending)
    expect((await api.load(organizationId)).applications.find((a) => a.id === pending.id)?.status).toBe("Under Review")
  })
})

describe("publishing a member application form", () => {
  it("makes the working version live and applies the joining settings", async () => {
    const api = service()
    const { forms } = await api.load(organizationId)
    const draftForm = forms.find((f) => f.status === "Draft")!
    const published = await api.publishForm(organizationId, draftForm, draftForm.versions[0], { joinMode: "Open", groupId: "group-youth", linkEnabled: true })
    expect(published.status).toBe("Published")
    expect(published.joinMode).toBe("Open")
    expect(published.groupId).toBe("group-youth")
    expect(published.linkEnabled).toBe(true)
    expect(published.publishedVersionId).toBe(draftForm.versions[0].id)
    const stored = (await api.load(organizationId)).forms.find((f) => f.id === draftForm.id)!
    expect(stored.versions.find((v) => v.id === draftForm.versions[0].id)?.status).toBe("Published")
  })

  it("archives the previously published version rather than losing it", async () => {
    const api = service()
    const { form, version } = seeded()
    const next = { ...version, id: "fv-next", version: version.version + 1, status: "Draft" as const }
    await api.publishForm(organizationId, { ...form, versions: [...form.versions, next] }, next, { joinMode: "Approval", groupId: form.groupId, linkEnabled: true })
    const stored = (await api.load(organizationId)).forms.find((f) => f.id === form.id)!
    expect(stored.publishedVersionId).toBe("fv-next")
    expect(stored.versions.find((v) => v.id === version.id)?.status).toBe("Archived")
  })

  it("takes the link down and puts it back without touching the versions", async () => {
    const api = service()
    const { form } = seeded()
    const off = await api.setLinkEnabled(organizationId, form, false)
    expect(off.linkEnabled).toBe(false)
    expect(off.publishedVersionId).toBe(form.publishedVersionId)
    const on = await api.setLinkEnabled(organizationId, off, true)
    expect(on.linkEnabled).toBe(true)
  })

  it("archiving a form takes its link down for good", async () => {
    const api = service()
    const { form } = seeded()
    await api.archiveForm(organizationId, form)
    const stored = (await api.load(organizationId)).forms.find((f) => f.id === form.id)!
    expect(stored.status).toBe("Archived")
    expect(stored.linkEnabled).toBe(false)
    expect(stored.publishedVersionId).toBeUndefined()
    expect(stored.versions.every((v) => v.status !== "Published")).toBe(true)
  })
})
