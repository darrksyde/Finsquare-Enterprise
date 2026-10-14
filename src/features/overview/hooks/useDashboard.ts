import { useMemo } from "react"
import { useOrganizationId } from "@/hooks/useOrganizationId"
import { useWorkspace } from "@/app/providers/WorkspaceProvider"
import { useMembers } from "@/features/members/hooks/useMembers"
import { useGroups } from "@/features/groups/hooks/useGroups"
import { useBranches } from "@/features/branches/hooks/useBranches"
import { useContributions } from "@/features/contributions/hooks/useContributions"
import { useDues } from "@/features/dues/hooks/useDues"
import { useLoans } from "@/features/loans/hooks/useLoans"
import { useWallet } from "@/features/wallet/hooks/useWallet"
import { useAdministrators } from "@/features/administrators/hooks/useAdministrators"
import { useMemberApplications } from "@/features/members/hooks/useMemberApplications"
import { summarizeContributions } from "@/features/contributions/domain/contribution.rules"
import { money } from "@/features/loans/components/LoanUi"
import {
  attentionItems,
  dashboardMetrics,
  eyebrowFor,
  greetingFor,
  isEmptyCommunity,
  type DashboardAttentionItem,
  type DashboardInput,
  type Metric,
} from "../domain/dashboard"

/**
 * The dashboard, built from the records the active community actually has.
 *
 * Every figure is a count or a total over real data, so a community that has just been created shows
 * its own emptiness rather than another community's numbers, and each card leads to the records
 * behind it.
 */
export function useDashboard() {
  const organizationId = useOrganizationId()
  const { state } = useWorkspace()
  const members = useMembers(organizationId)
  const groups = useGroups(organizationId)
  const branches = useBranches(organizationId)
  const contributions = useContributions(organizationId)
  const dues = useDues(organizationId)
  const loans = useLoans()
  const wallet = useWallet()
  const administrators = useAdministrators(organizationId)
  const applications = useMemberApplications(organizationId)

  const contributionSummary = useMemo(
    () => (contributions.data ? summarizeContributions(contributions.data) : null),
    [contributions.data],
  )

  /**
   * The date line and the greeting are read once per community, not per render, so the page cannot
   * show a different day than the one it loaded on.
   */
  const { eyebrow, greeting } = useMemo(() => {
    const opened = new Date()
    return { eyebrow: eyebrowFor(opened), greeting: greetingFor(opened.getHours()) }
    // The community is the dependency on purpose: switching community re-reads the clock rather than
    // showing the day the page was first opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId])

  const input = useMemo<DashboardInput>(
    () => ({
      memberCount: members.members.length,
      membersAwaitingApproval: members.members.filter((member) => member.status === "Pending").length,
      groupCount: groups.groups.length,
      branchCount: branches.branches.length,
      activeContributions: contributionSummary?.activeContributions ?? 0,
      contributionCollected: money(contributionSummary?.totalCollected ?? 0),
      duesOutstanding: money(dues.summary?.outstandingAmount ?? 0),
      membersWithArrears: dues.summary?.unpaidMembers ?? 0,
      loanApplications: loans.data?.applications.length ?? 0,
      loanApplicationsAwaitingReview:
        loans.data?.applications.filter((application) => application.status === "Submitted").length ?? 0,
      walletApprovalsPending:
        wallet.data?.approvals.filter((approval) => approval.status === "Pending").length ?? 0,
      administratorsAwaitingSetup: administrators.administrators.filter(
        (administrator) => administrator.status === "invited",
      ).length,
      applicationsAwaitingReview:
        applications.data?.applications.filter(
          (application) => application.status === "Submitted" || application.status === "Under Review",
        ).length ?? 0,
      corporateAccountConnected: state.corporateAccountStatus === "Connected",
      complianceDocumentsOutstanding: state.complianceDocuments.filter(
        (document) => document !== "Approved",
      ).length,
    }),
    [
      members.members,
      groups.groups,
      branches.branches,
      contributionSummary,
      dues.summary,
      loans.data,
      wallet.data,
      administrators.administrators,
      applications.data,
      state.corporateAccountStatus,
      state.complianceDocuments,
    ],
  )

  const metrics: Metric[] = useMemo(() => dashboardMetrics(input), [input])
  const attention: DashboardAttentionItem[] = useMemo(() => attentionItems(input), [input])

  /** The newest records in the register, which is the only activity this build can evidence. */
  const latestMembers = useMemo(
    () => [...members.members].sort((a, b) => b.id.localeCompare(a.id)).slice(0, 4),
    [members.members],
  )

  const sources = [members, groups, branches, administrators, applications]
  const failed = sources.find((resource) => resource.error)
  const loading = members.status === "loading" || groups.status === "loading" || branches.status === "loading"

  return {
    status: failed ? "error" : loading ? "loading" : "success",
    error: failed?.error ?? null,
    retry: () => sources.forEach((resource) => resource.retry()),
    metrics,
    attention,
    latestMembers,
    hasNoRecords: isEmptyCommunity(input),
    eyebrow,
    greeting,
  }
}
