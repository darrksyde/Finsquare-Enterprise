import { apiClient, endpoints } from "@/services/api"
import { env } from "@/app/config/env"
import { emptyCorporateDetails } from "@/features/onboarding/types"
import type { CorporateAccountRepository, CorporateAccountState } from "./corporate-account.repository"

class MockCorporateAccountRepository implements CorporateAccountRepository {
  private state: CorporateAccountState = {
    status: "Not connected",
    details: { ...emptyCorporateDetails },
  }

  async get(): Promise<CorporateAccountState> {
    return this.state
  }

  async update(_organizationId: string, state: CorporateAccountState): Promise<void> {
    this.state = state
  }
}

class ApiCorporateAccountRepository implements CorporateAccountRepository {
  async get(): Promise<CorporateAccountState> {
    return apiClient.get<CorporateAccountState>(endpoints.corporateAccount.account)
  }

  async update(_organizationId: string, state: CorporateAccountState): Promise<void> {
    await apiClient.patch(endpoints.corporateAccount.account, state)
  }
}

export const corporateAccountService: CorporateAccountRepository = env.VITE_ENABLE_MOCKS
  ? new MockCorporateAccountRepository()
  : new ApiCorporateAccountRepository()
