import { apiClient, endpoints } from "@/services/api"
import { env } from "@/app/config/env"
import { complianceDocumentsMock } from "../mocks/compliance.mock"
import type { ComplianceCase, ComplianceDocument } from "@/types"
import type { ComplianceRepository } from "./compliance.repository"

class MockComplianceRepository implements ComplianceRepository {
  async getCase(organizationId: string): Promise<ComplianceCase> {
    return {
      id: "compliance-case-demo",
      organizationId,
      status: "in_progress",
      documents: structuredClone(complianceDocumentsMock),
      representatives: [],
    }
  }

  async uploadDocument(
    _organizationId: string,
    requirementId: string,
    file: File,
  ): Promise<ComplianceDocument> {
    return {
      id: `document-${requirementId}`,
      requirementId,
      name: file.name,
      status: "Pending",
      fileName: file.name,
      updatedAt: new Date().toISOString(),
    }
  }

  async replaceDocument(
    organizationId: string,
    documentId: string,
    file: File,
  ): Promise<ComplianceDocument> {
    return this.uploadDocument(organizationId, documentId, file)
  }
}

class ApiComplianceRepository implements ComplianceRepository {
  getCase(organizationId: string) {
    return apiClient.get<ComplianceCase>(
      endpoints.compliance.case(organizationId),
    )
  }

  uploadDocument(organizationId: string, requirementId: string, file: File) {
    return apiClient.post<ComplianceDocument>(
      `${endpoints.compliance.case(organizationId)}/documents`,
      { requirementId, fileName: file.name },
    )
  }

  replaceDocument(organizationId: string, documentId: string, file: File) {
    return apiClient.patch<ComplianceDocument>(
      `${endpoints.compliance.case(organizationId)}/documents/${documentId}`,
      { fileName: file.name },
    )
  }
}

export const complianceService: ComplianceRepository = env.VITE_ENABLE_MOCKS
  ? new MockComplianceRepository()
  : new ApiComplianceRepository()
