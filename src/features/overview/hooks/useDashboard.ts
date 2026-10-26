import { useMemo } from "react"
import { useOrganizationId } from "@/hooks/useOrganizationId"
import { useWorkspace } from "@/app/providers/WorkspaceProvider"
import { useMembers } from "@/features/members/hooks/useMembers"
import { useContributions } from "@/features/contributions/hooks/useContributions"
import { useLoans } from "@/features/loans/hooks/useLoans"
import { useWallet } from "@/features/wallet/hooks/useWallet"
import { useAdministrators } from "@/features/administrators/hooks/useAdministrators"
import { summarizeContributions } from "@/features/contributions/domain/contribution.rules"
import {
  attentionItems,
  dashboardMetrics,
  eyebrowFor,
  greetingFor,
  isEmptyCommunity,
  type DashboardAttentionItem,
  type DashboardCustomer,
  type DashboardData,
  type DashboardInput,
  type Metric,
} from "../domain/dashboard"

/**
 * The mock dashboard, built from the records the active community actually has.
 *
 * Every figure is a count or a total over real mock data, so a community that has just been created
 * shows its own emptiness rather than another community's numbers, and each card leads to the records
 * behind it.
 */
export function useDashboard(): DashboardData {
  const organizationId = useOrganizationId()
  const { state } = useWorkspace()
  const members = useMembers(organizationId)
  const contributions = useContributions(organizationId)
  const loans = useLoans()
  const wallet = useWallet()
  const administrators = useAdministrators(organizationId)

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

  const input = useMemo<DashboardInput>(() => {
    const applications = loans.data?.applications ?? []
    const loanList = loans.data?.loans ?? []
    const pendingApplications = applications.filter(
      (application) => application.status === "Submitted" || application.status === "Under Review",
    ).length
    const activeLoans = loanList.filter((loan) => loan.status === "Active" || loan.status === "Current").length
    const overdueLoans = loanList.filter((loan) => loan.status === "Overdue" || loan.status === "Defaulted").length
    const totalDisbursed = loanList.reduce((sum, loan) => sum + loan.netDisbursed, 0)
    const totalRepaid = loanList.reduce((sum, loan) => sum + loan.paid, 0)
    return {
      customerCount: members.members.length,
      customersAwaitingApproval: members.members.filter((member) => member.status === "Pending").length,
      activeLoans,
      overdueLoans,
      totalApplications: applications.length,
      pendingApplications,
      totalDisbursed,
      totalRepaid,
      repaymentRate: totalDisbursed > 0 ? Math.round((totalRepaid / totalDisbursed) * 1000) / 10 : 0,
      activeEsusu: contributionSummary?.activeContributions ?? 0,
      esusuCollected: contributionSummary?.totalCollected ?? 0,
      walletApprovalsPending:
        wallet.data?.approvals.filter((approval) => approval.status === "Pending").length ?? 0,
      staffAwaitingSetup: administrators.administrators.filter(
        (administrator) => administrator.status === "invited",
      ).length,
      walletConnected: state.corporateAccountStatus === "Connected",
      latestCustomers: [...members.members]
        .sort((a, b) => b.id.localeCompare(a.id))
        .slice(0, 4)
        .map((member) => ({ id: member.id, name: member.name, status: member.status, joinedAt: member.joinedAt })),
    }
  }, [members.members, loans.data, contributionSummary, wallet.data, administrators.administrators, state.corporateAccountStatus])

  const metrics: Metric[] = useMemo(() => dashboardMetrics(input), [input])
  const attention: DashboardAttentionItem[] = useMemo(() => attentionItems(input), [input])
  const latestCustomers: DashboardCustomer[] = input.latestCustomers

  const sources = [members, loans, wallet, administrators]
  const failed = sources.find((resource) => resource.error)
  const loading = members.status === "loading"

  return {
    status: failed ? "error" : loading ? "loading" : "success",
    error: failed?.error ?? null,
    retry: () => sources.forEach((resource) => resource.retry()),
    metrics,
    attention,
    latestCustomers,
    hasNoRecords: isEmptyCommunity(input),
    eyebrow,
    greeting,
  }
}
