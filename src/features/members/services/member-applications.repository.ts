import type { MemberApplication, MemberApplicationDataset, MemberApplicationForm } from "../types/member-application.types"

/** Contract for the member application data source. Swap the mock for an API-backed implementation later. */
export interface MemberApplicationRepository {
  load(organizationId: string): Promise<MemberApplicationDataset>
  saveForm(organizationId: string, form: MemberApplicationForm): Promise<void>
  saveApplication(organizationId: string, application: MemberApplication): Promise<void>
  subscribe(listener: () => void): () => void
}
