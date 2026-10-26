import { mockId } from "@/features/forms/domain/forms"
import { env } from "@/app/config/env"
import { membersService } from "./members.service"
import {
  applicantName,
  approveApplication,
  markUnderReview,
  newMemberApplicationForm,
  rejectApplication,
  submittedStatus,
  toCreateMemberInput,
} from "../domain/member-application.rules"
import { ApiMemberApplicationRepository } from "./api-member-applications.repository"
import { createMockMemberApplicationRepository } from "./mock-member-applications.repository"
import type { MemberApplicationRepository } from "./member-applications.repository"
import type { FormResponseValue, FormVersion } from "@/features/forms/types/form.types"
import type { MemberJoinMode } from "../types/member-application.types"
import type { MemberApplication, MemberApplicationForm } from "../types/member-application.types"
import { applyDraft, applyPublish } from "@/features/forms/domain/forms"

const today = () => new Date().toISOString().slice(0, 10)

export interface JoinSettings {
  joinMode: MemberJoinMode
  groupId: string
  linkEnabled: boolean
}

export interface SubmissionInput {
  form: MemberApplicationForm
  version: FormVersion
  values: Record<string, FormResponseValue>
  source: MemberApplication["source"]
}

/**
 * Member onboarding. The four things an administrator asks — who applied, what they answered, is
 * the link live, and has this person become a member — are decided here, never in a component.
 *
 * Approving and open joining both create the member through the member service, so there is exactly
 * one way a member record comes into existence.
 */
export class MemberApplicationsService {
  constructor(private repository: MemberApplicationRepository) {}

  load = (organizationId: string) => this.repository.load(organizationId)
  subscribe = (listener: () => void) => this.repository.subscribe(listener)

  async saveDraft(organizationId: string, form: MemberApplicationForm, version: FormVersion): Promise<MemberApplicationForm> {
    const next = applyDraft(form, version)
    await this.repository.saveForm(organizationId, next)
    return next
  }

  /** Publishing makes the working version live and switches the link back on. */
  async publishForm(organizationId: string, form: MemberApplicationForm, version: FormVersion, settings: JoinSettings): Promise<MemberApplicationForm> {
    const published = applyPublish({ ...form, joinMode: settings.joinMode, groupId: settings.groupId, linkEnabled: settings.linkEnabled }, version)
    await this.repository.saveForm(organizationId, published)
    return published
  }

  async saveForm(organizationId: string, form: MemberApplicationForm): Promise<void> {
    await this.repository.saveForm(organizationId, form)
  }

  /** Takes the link down without archiving the form, or puts it back. */
  async setLinkEnabled(organizationId: string, form: MemberApplicationForm, linkEnabled: boolean): Promise<MemberApplicationForm> {
    const next = { ...form, linkEnabled }
    await this.repository.saveForm(organizationId, next)
    return next
  }

  async archiveForm(organizationId: string, form: MemberApplicationForm): Promise<void> {
    await this.repository.saveForm(organizationId, {
      ...form,
      status: "Archived",
      publishedVersionId: undefined,
      linkEnabled: false,
      versions: form.versions.map((version) => (version.status === "Published" ? { ...version, status: "Archived" as const } : version)),
    })
  }

  /** Creates a fresh, empty form to work on. */
  createForm(name: string, groupId: string): MemberApplicationForm {
    return newMemberApplicationForm(name, groupId)
  }

  /** Records a submission from the public link or a form an administrator filled in for someone. */
  async submit(organizationId: string, input: SubmissionInput): Promise<MemberApplication> {
    const { form, version, values, source } = input
    const dataset = await this.repository.load(organizationId)
    const status = submittedStatus(form.joinMode)
    const application: MemberApplication = {
      id: mockId("ma"),
      reference: `MA-${String(dataset.applications.length + 1).padStart(4, "0")}`,
      formId: form.id,
      formName: form.name,
      versionId: version.id,
      versionNumber: version.version,
      submittedAt: today(),
      status,
      values,
      source,
    }
    if (status === "Approved") {
      const member = await membersService.create(organizationId, toCreateMemberInput(values, form.groupId))
      application.memberId = member.id
      application.decidedAt = today()
      application.reviewer = "Automatic (open joining)"
    }
    await this.repository.saveApplication(organizationId, application)
    await this.repository.saveForm(organizationId, { ...form, submissions: form.submissions + 1 })
    return application
  }

  async markUnderReview(organizationId: string, application: MemberApplication): Promise<void> {
    await this.repository.saveApplication(organizationId, markUnderReview(application))
  }

  /** Approving creates the member from the answers the applicant gave. */
  async approve(organizationId: string, application: MemberApplication, reviewer: string): Promise<MemberApplication> {
    const form = await this.formFor(organizationId, application)
    const member = await membersService.create(organizationId, toCreateMemberInput(application.values, form?.groupId ?? ""))
    const approved = approveApplication(application, member.id, reviewer)
    await this.repository.saveApplication(organizationId, approved)
    return approved
  }

  async reject(organizationId: string, application: MemberApplication, reason: string, reviewer: string): Promise<MemberApplication> {
    const rejected = rejectApplication(application, reason, reviewer)
    await this.repository.saveApplication(organizationId, rejected)
    return rejected
  }

  /** The applicant shown in the applications list, resolved from the answers. */
  applicantOf = (application: MemberApplication) => applicantName(application.values)

  /** Public link: resolves a form by slug without a session. */
  getPublicForm = (slug: string) => this.repository.getPublicForm(slug)

  /** Public link: submission is owned by the backend (reference, join decision, member creation). */
  submitPublic = (slug: string, values: Record<string, FormResponseValue>) => this.repository.submitPublic(slug, values)

  private async formFor(organizationId: string, application: MemberApplication) {
    const dataset = await this.repository.load(organizationId)
    return dataset.forms.find((form) => form.id === application.formId)
  }
}

const repository: MemberApplicationRepository = env.VITE_ENABLE_MOCKS
  ? createMockMemberApplicationRepository()
  : new ApiMemberApplicationRepository()

export const memberApplicationsService = new MemberApplicationsService(repository)
