import type { ComplianceDocumentStatus } from "@/types"

/** Contract for the compliance checklist's mutable state: the per-document statuses. */
export interface ComplianceRepository {
  getStatuses(organizationId: string): Promise<ComplianceDocumentStatus[]>
  updateStatuses(
    organizationId: string,
    statuses: ComplianceDocumentStatus[],
  ): Promise<void>
}
