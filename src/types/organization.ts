import type { EntityId } from "./common"

export const ORGANIZATION_ENVIRONMENTS = [
  "demo",
  "pending_review",
  "live",
  "suspended",
] as const
export type OrganizationEnvironment = typeof ORGANIZATION_ENVIRONMENTS[number]

export interface OrganizationBranding {
  logoUrl?: string
  primaryColor: string
  colorMode: "light" | "dark"
}

export interface Organization {
  id: EntityId
  name: string
  type: string
  country: string
  email: string
  phone: string
  address: string
  website?: string
  environment: OrganizationEnvironment
  enabledModules: string[]
  branding: OrganizationBranding
}
