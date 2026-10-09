import type { CorporateAccountApplication } from "@/types"

export interface CorporateAccountRepository {
  getApplication(
    organizationId: string,
  ): Promise<CorporateAccountApplication | null>
  submitApplication(
    organizationId: string,
    input: Omit<CorporateAccountApplication, "id" | "organizationId" | "status">,
  ): Promise<CorporateAccountApplication>
}
