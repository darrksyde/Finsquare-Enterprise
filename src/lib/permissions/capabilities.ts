import type { OrganizationEnvironment } from "@/types"

export const CAPABILITIES = [
  "workspace.configure",
  "members.manage",
  "financial_transaction",
  "payment.record",
  "loan.disburse",
  "transfer.create",
  "wallet.configure",
] as const

export type Capability = typeof CAPABILITIES[number]

const environmentCapabilities: Record<OrganizationEnvironment, ReadonlySet<Capability>> =
  {
    demo: new Set(["workspace.configure", "members.manage", "wallet.configure"]),
    pending_review: new Set(["workspace.configure", "members.manage", "wallet.configure"]),
    live: new Set(CAPABILITIES),
    suspended: new Set(),
  }

export function canPerform(
  environment: OrganizationEnvironment,
  capability: Capability,
): boolean {
  return environmentCapabilities[environment].has(capability)
}

export type MoneyMovementMode = "live" | "simulated" | "blocked"

export function moneyMovementMode(
  environment: OrganizationEnvironment,
): MoneyMovementMode {
  if (canPerform(environment, "financial_transaction")) return "live"
  return environment === "demo" ? "simulated" : "blocked"
}
