import {
  Activity,
  Banknote,
  Blocks,
  CalendarDays,
  CreditCard,
  Folder,
  FormInput,
  GitBranch,
  HandCoins,
  MessageSquareText,
  Network,
  ReceiptText,
  RefreshCcw,
  ShieldCheck,
  Users,
  Landmark,
  WalletCards,
  type IconType,
} from "@/icons"

export const MODULE_CATEGORIES = [
  "Core",
  "Finance",
  "Credit",
  "Communications",
  "Community",
  "Other",
] as const
export type ModuleCategory = typeof MODULE_CATEGORIES[number]

export type EnterpriseModuleId = "wallet" | "members" | "groups" | "branches" | "contributions" | "dues" | "payments" | "savings" | "loans" | "repayments" | "guarantors" | "communication" | "events" | "documents" | "forms" | "reports"

export interface EnterpriseModuleDefinition {
  id: EnterpriseModuleId
  group: ModuleCategory
  name: string
  description: string
  icon: IconType
  dependencies: EnterpriseModuleId[]
}

export const enterpriseModules: EnterpriseModuleDefinition[] = [
  {
    id: "members",
    group: "Core",
    name: "Members",
    description: "Manage member records and accounts.",
    icon: Users,
    dependencies: [],
  },
  {
    id: "groups",
    group: "Core",
    name: "Groups",
    description: "Organize members into flexible groups.",
    icon: Network,
    dependencies: ["members"],
  },
  {
    id: "branches",
    group: "Core",
    name: "Branches",
    description: "Manage organizational branches.",
    icon: GitBranch,
    dependencies: ["members"],
  },
  {
    id: "wallet",
    group: "Finance",
    name: "Wallets & Accounts",
    description: "Organization account, branch wallets, funding, transfers and disbursements.",
    icon: Landmark,
    dependencies: ["members"],
  },
  {
    id: "contributions",
    group: "Finance",
    name: "Contributions",
    description: "Ajo and savings collections, targeted funds and public contribution links.",
    icon: HandCoins,
    dependencies: ["members"],
  },
  {
    id: "dues",
    group: "Finance",
    name: "Dues",
    description: "Collect recurring membership dues.",
    icon: ReceiptText,
    dependencies: ["members"],
  },
  {
    id: "payments",
    group: "Finance",
    name: "Payments",
    description: "Record and manage member payments.",
    icon: CreditCard,
    dependencies: ["members"],
  },
  {
    id: "savings",
    group: "Finance",
    name: "Savings",
    description: "Create savings products and targets.",
    icon: WalletCards,
    dependencies: ["members"],
  },
  {
    id: "loans",
    group: "Credit",
    name: "Loans",
    description: "Manage products and loan applications.",
    icon: Banknote,
    dependencies: ["members", "payments"],
  },
  {
    id: "repayments",
    group: "Credit",
    name: "Repayments",
    description: "Track schedules and repayments.",
    icon: RefreshCcw,
    dependencies: ["loans"],
  },
  {
    id: "guarantors",
    group: "Credit",
    name: "Guarantors",
    description: "Manage guarantor approvals.",
    icon: ShieldCheck,
    dependencies: ["loans"],
  },
  {
    id: "communication",
    group: "Communications",
    name: "Communications",
    description: "Message members, groups and branches by SMS and email.",
    icon: MessageSquareText,
    dependencies: ["members"],
  },
  {
    id: "events",
    group: "Community",
    name: "Events",
    description: "Manage organizational events.",
    icon: CalendarDays,
    dependencies: [],
  },
  {
    id: "documents",
    group: "Community",
    name: "Documents",
    description: "Store important organization files.",
    icon: Folder,
    dependencies: [],
  },
  {
    id: "forms",
    group: "Other",
    name: "Forms",
    description: "Build and publish custom forms.",
    icon: FormInput,
    dependencies: [],
  },
  {
    id: "reports",
    group: "Other",
    name: "Reports",
    description: "Analyze organization activity.",
    icon: Activity,
    dependencies: [],
  },
]

export const moduleRegistry = Object.fromEntries(
  enterpriseModules.map((module) => [module.id, module]),
) as Record<EnterpriseModuleId, EnterpriseModuleDefinition>

export const DEFAULT_ENABLED_MODULES: EnterpriseModuleId[] = [
  "members",
  "groups",
  "branches",
  "wallet",
  "contributions",
  "dues",
  "payments",
  "loans",
  "communication",
  "reports",
]

export function getMissingDependencies(
  moduleId: EnterpriseModuleId,
  enabledModules: ReadonlySet<string>,
): EnterpriseModuleId[] {
  return moduleRegistry[moduleId].dependencies.filter(
    (dependency) => !enabledModules.has(dependency),
  )
}

export function getEnabledDependents(
  moduleId: EnterpriseModuleId,
  enabledModules: ReadonlySet<string>,
): EnterpriseModuleDefinition[] {
  return enterpriseModules.filter(
    (module) =>
      enabledModules.has(module.id) && module.dependencies.includes(moduleId),
  )
}

export const MODULES_ICON = Blocks
