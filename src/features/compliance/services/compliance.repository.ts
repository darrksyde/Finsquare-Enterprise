import type { ComplianceCase, ComplianceDocument } from "@/types"

export interface ComplianceRepository {
  getCase(organizationId: string): Promise<ComplianceCase>
  uploadDocument(
    organizationId: string,
    requirementId: string,
    file: File,
  ): Promise<ComplianceDocument>
  replaceDocument(
    organizationId: string,
    documentId: string,
    file: File,
  ): Promise<ComplianceDocument>
}
