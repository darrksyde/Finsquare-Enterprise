import { apiClient, endpoints } from "@/services/api"
import { env } from "@/app/config/env"
import { complianceDocumentsMock } from "../mocks/compliance.mock"
import type { ComplianceDocumentStatus } from "@/types"
import type { ComplianceRepository } from "./compliance.repository"

const DEFAULT_STATUSES: ComplianceDocumentStatus[] = complianceDocumentsMock.map((document) => document.status)

class MockComplianceRepository implements ComplianceRepository {
  private statuses: ComplianceDocumentStatus[] = [...DEFAULT_STATUSES]

  async getStatuses(): Promise<ComplianceDocumentStatus[]> {
    return [...this.statuses]
  }

  async updateStatuses(_organizationId: string, statuses: ComplianceDocumentStatus[]): Promise<void> {
    this.statuses = [...statuses]
  }
}

class ApiComplianceRepository implements ComplianceRepository {
  async getStatuses(): Promise<ComplianceDocumentStatus[]> {
    const response = await apiClient.get<{ statuses: ComplianceDocumentStatus[] }>(endpoints.compliance.statuses)
    return response.statuses
  }

  async updateStatuses(_organizationId: string, statuses: ComplianceDocumentStatus[]): Promise<void> {
    await apiClient.patch(endpoints.compliance.statuses, { statuses })
  }
}

export const complianceService: ComplianceRepository = env.VITE_ENABLE_MOCKS
  ? new MockComplianceRepository()
  : new ApiComplianceRepository()
