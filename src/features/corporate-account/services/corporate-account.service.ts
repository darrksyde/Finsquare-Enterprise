import { env } from "@/app/config/env"
import { apiClient, endpoints } from "@/services/api"
import type { CorporateAccountApplication } from "@/types"
import type { CorporateAccountRepository } from "./corporate-account.repository"

class MockCorporateAccountRepository implements CorporateAccountRepository {
  async getApplication(): Promise<CorporateAccountApplication | null> {
    return null
  }

  async submitApplication(
    organizationId: string,
    input: Omit<CorporateAccountApplication, "id" | "organizationId" | "status">,
  ): Promise<CorporateAccountApplication> {
    return {
      ...input,
      id: "corporate-account-application-demo",
      organizationId,
      status: "Under review",
    }
  }
}

class ApiCorporateAccountRepository implements CorporateAccountRepository {
  getApplication(organizationId: string) {
    return apiClient.get<CorporateAccountApplication | null>(
      endpoints.corporateAccount.application(organizationId),
    )
  }

  submitApplication(
    organizationId: string,
    input: Omit<CorporateAccountApplication, "id" | "organizationId" | "status">,
  ) {
    return apiClient.post<CorporateAccountApplication>(
      endpoints.corporateAccount.application(organizationId),
      input,
    )
  }
}

export const corporateAccountService: CorporateAccountRepository =
  env.VITE_ENABLE_MOCKS
    ? new MockCorporateAccountRepository()
    : new ApiCorporateAccountRepository()
