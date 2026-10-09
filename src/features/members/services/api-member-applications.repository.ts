import { apiClient, endpoints } from "@/services/api"
import type { MemberApplication, MemberApplicationDataset, MemberApplicationForm } from "../types/member-application.types"
import type { MemberApplicationRepository } from "./member-applications.repository"

/**
 * API-backed repository. Each mutation is a named command rather than a dataset batch, because the
 * backend owns reference allocation, the join-mode decision, member creation and the audit record.
 */
export class ApiMemberApplicationRepository implements MemberApplicationRepository {
  async load(organizationId: string): Promise<MemberApplicationDataset> {
    return apiClient.get<MemberApplicationDataset>(endpoints.memberApplications.workspace(organizationId))
  }

  async saveForm(organizationId: string, form: MemberApplicationForm): Promise<void> {
    await apiClient.post(endpoints.memberApplications.forms(organizationId), form)
  }

  async saveApplication(organizationId: string, application: MemberApplication): Promise<void> {
    await apiClient.post(endpoints.memberApplications.applications(organizationId), application)
  }

  subscribe(): () => void {
    // A real implementation would subscribe to a websocket or poll for invalidation.
    return () => {}
  }
}
