import type { CorporateAccountStatus } from "@/types"
import type { CorporateAccountDetails } from "@/features/onboarding/types"

export interface CorporateAccountState {
  status: CorporateAccountStatus
  details: CorporateAccountDetails
}

export interface CorporateAccountRepository {
  get(organizationId: string): Promise<CorporateAccountState>
  update(organizationId: string, state: CorporateAccountState): Promise<void>
}
