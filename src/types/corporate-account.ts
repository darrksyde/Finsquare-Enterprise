import type { EntityId } from "./common"

export type CorporateAccountStatus = "Not connected" | "Under review" | "Connected"

export interface CorporateAccountApplication {
  id: EntityId
  organizationId: EntityId
  status: CorporateAccountStatus
  accountType: string
  currency: string
  settlementPreference: string
  authorizedAdministratorIds: EntityId[]
}

export interface CorporateAccount {
  id: EntityId
  organizationId: EntityId
  currency: string
  status: "active" | "restricted" | "closed"
}
