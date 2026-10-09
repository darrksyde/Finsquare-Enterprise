import type { EntityId } from "./common"

export type ComplianceDocumentStatus = "Approved" | "Pending" | "Required"
export type VerificationStatus = "not_started" | "in_progress" | "verified" | "rejected"

export interface ComplianceRequirement {
  id: EntityId
  name: string
  description: string
  organizationTypes: string[]
  required: boolean
}

export interface ComplianceDocument {
  id: EntityId
  requirementId: EntityId
  name: string
  status: ComplianceDocumentStatus
  fileName?: string
  updatedAt?: string
}

export interface AuthorizedRepresentative {
  id: EntityId
  name: string
  role: string
  identityStatus: VerificationStatus
}

export interface ComplianceCase {
  id: EntityId
  organizationId: EntityId
  status: VerificationStatus
  documents: ComplianceDocument[]
  representatives: AuthorizedRepresentative[]
}
