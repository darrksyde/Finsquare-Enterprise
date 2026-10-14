import type { View } from "@/types"

export interface Metric {
  id: "members" | "groups" | "contributions" | "dues" | "loans" | "approvals"
  label: string
  value: string
  detail: string
  /** Where the card opens: a count is only useful if it leads to the records behind it. */
  target: View
}

/** One thing waiting on an administrator, with the page that owns the work. */
export interface DashboardAttentionItem {
  id: string
  label: string
  category: string
  target: View
}

/** Everything the dashboard needs. All of it comes from records; none of it is written by hand. */
export interface DashboardInput {
  memberCount: number
  membersAwaitingApproval: number
  groupCount: number
  branchCount: number
  activeContributions: number
  contributionCollected: string
  duesOutstanding: string
  membersWithArrears: number
  loanApplications: number
  loanApplicationsAwaitingReview: number
  walletApprovalsPending: number
  administratorsAwaitingSetup: number
  applicationsAwaitingReview: number
  corporateAccountConnected: boolean
  complianceDocumentsOutstanding: number
}

export function dashboardMetrics(input: DashboardInput): Metric[] {
  return [
    {
      id: "members",
      label: "Members",
      value: input.memberCount.toLocaleString(),
      detail: input.membersAwaitingApproval
        ? `${input.membersAwaitingApproval.toLocaleString()} awaiting approval`
        : "None awaiting approval",
      target: "members",
    },
    {
      id: "groups",
      label: "Groups",
      value: input.groupCount.toLocaleString(),
      detail: `Across ${input.branchCount.toLocaleString()} ${input.branchCount === 1 ? "branch" : "branches"}`,
      target: "groups",
    },
    {
      id: "contributions",
      label: "Contributions",
      value: input.activeContributions.toLocaleString(),
      detail: `${input.contributionCollected} collected`,
      target: "contributions",
    },
    {
      id: "dues",
      label: "Outstanding dues",
      value: input.duesOutstanding,
      detail: input.membersWithArrears
        ? `${input.membersWithArrears.toLocaleString()} members`
        : "Nothing outstanding",
      target: "dues",
    },
    {
      id: "loans",
      label: "Loan applications",
      value: input.loanApplications.toLocaleString(),
      detail: `${input.loanApplicationsAwaitingReview.toLocaleString()} awaiting review`,
      target: "loan-applications",
    },
    {
      id: "approvals",
      label: "Pending approvals",
      value: input.walletApprovalsPending.toLocaleString(),
      detail: "Waiting on the wallet",
      target: "wallet",
    },
  ]
}

/**
 * What actually needs an administrator's attention. Each item appears only when at least one record
 * backs it, so a community with nothing outstanding gets an empty list rather than a list of
 * imaginary problems.
 */
export function attentionItems(input: DashboardInput): DashboardAttentionItem[] {
  const items: DashboardAttentionItem[] = []

  const awaiting = input.membersAwaitingApproval + input.applicationsAwaitingReview
  if (awaiting) {
    items.push({
      id: "members",
      label: `${awaiting.toLocaleString()} ${awaiting === 1 ? "person is" : "people are"} waiting on approval`,
      category: "Membership",
      target: input.applicationsAwaitingReview ? "member-applications" : "members",
    })
  }
  if (input.walletApprovalsPending) {
    items.push({
      id: "wallet",
      label: `${input.walletApprovalsPending.toLocaleString()} wallet ${input.walletApprovalsPending === 1 ? "approval" : "approvals"} pending`,
      category: "Finance",
      target: "wallet",
    })
  }
  if (input.administratorsAwaitingSetup) {
    items.push({
      id: "administrators",
      label:
        input.administratorsAwaitingSetup === 1
          ? "1 administrator hasn’t completed setup"
          : `${input.administratorsAwaitingSetup} administrators haven’t completed setup`,
      category: "Access",
      target: "administrators",
    })
  }
  if (!input.corporateAccountConnected) {
    items.push({
      id: "corporate",
      label: "Corporate account not connected",
      category: "Financial setup",
      target: "corporate",
    })
  }
  if (input.complianceDocumentsOutstanding) {
    items.push({
      id: "compliance",
      label:
        input.complianceDocumentsOutstanding === 1
          ? "1 compliance document is outstanding"
          : `${input.complianceDocumentsOutstanding} compliance documents are outstanding`,
      category: "Compliance",
      target: "compliance",
    })
  }

  return items
}

/** A community with nothing in it gets a get-started panel instead of six cards reading zero. */
export function isEmptyCommunity(input: DashboardInput): boolean {
  return (
    input.memberCount === 0 &&
    input.groupCount === 0 &&
    input.branchCount === 0 &&
    input.activeContributions === 0 &&
    input.loanApplications === 0
  )
}

const TIME_OF_DAY = [
  { until: 12, greeting: "Good morning" },
  { until: 17, greeting: "Good afternoon" },
  { until: 24, greeting: "Good evening" },
]

export function greetingFor(hour: number): string {
  return TIME_OF_DAY.find((part) => hour < part.until)?.greeting ?? "Hello"
}

/**
 * The date line above the title, formatted from a real date rather than written in, so it cannot
 * disagree with the day the administrator is actually working.
 */
export function eyebrowFor(date: Date): string {
  const weekday = date.toLocaleDateString("en-GB", { weekday: "long" })
  const day = date.toLocaleDateString("en-GB", { day: "numeric", month: "long" })
  return `${weekday}, ${day}`.toUpperCase()
}
