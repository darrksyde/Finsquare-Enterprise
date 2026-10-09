import type { ComplianceDocument, ComplianceRequirement } from "@/types"

export const complianceRequirementsMock: ComplianceRequirement[] = [
  {
    id: "organization-registration",
    name: "Organization registration",
    description: "Evidence that the organization is legally registered.",
    organizationTypes: ["Cooperative", "Association", "Union"],
    required: true,
  },
  {
    id: "cac-documents",
    name: "CAC documents",
    description: "Applicable corporate registration documents.",
    organizationTypes: ["Cooperative", "Association"],
    required: true,
  },
  {
    id: "representative-id",
    name: "Authorized representative ID",
    description: "Valid identity document for an authorized representative.",
    organizationTypes: ["*"],
    required: true,
  },
  {
    id: "address-verification",
    name: "Address verification",
    description: "Evidence of the organization’s operating address.",
    organizationTypes: ["*"],
    required: true,
  },
  {
    id: "board-resolution",
    name: "Board resolution",
    description: "Resolution authorizing the organization’s FinSquare account.",
    organizationTypes: ["*"],
    required: true,
  },
]

export const complianceDocumentsMock: ComplianceDocument[] =
  complianceRequirementsMock.map((requirement, index) => ({
    id: `document-${index + 1}`,
    requirementId: requirement.id,
    name: requirement.name,
    status: index < 3 ? "Approved" : index === 3 ? "Pending" : "Required",
    fileName: index < 4 ? `${requirement.id}.pdf` : undefined,
    updatedAt: index < 4 ? `2025-05-${18 + index}` : undefined,
  }))
