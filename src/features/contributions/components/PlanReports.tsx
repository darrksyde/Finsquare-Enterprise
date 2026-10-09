import { useMemo, useState } from "react"
import { Button } from "@/components/ui"
import { PagedTable, Panel } from "./ContributionUi"
import { downloadCsv, fmtDate, money } from "@/features/loans/components/LoanUi"
import { collectionHistory, commissionReport, missedContributionRows } from "../domain/reporting"
import type { ContributionCtx } from "./ContributionUi"

type ReportTab = "collections" | "missed" | "commissions"
type Granularity = "daily" | "weekly" | "monthly"

/**
 * Reporting for one plan only. The organization-wide view of the same figures
 * lives on the Reports page — this one never mixes plans.
 */
export function PlanReports({ ctx, contributionId }: { ctx: ContributionCtx; contributionId: string }) {
  const [tab, setTab] = useState<ReportTab>("collections")
  const [granularity, setGranularity] = useState<Granularity>("monthly")

  const scoped = useMemo(() => ({ contributionId }), [contributionId])
  const collections = useMemo(() => collectionHistory(ctx.data, granularity, scoped), [ctx.data, granularity, scoped])
  const missed = useMemo(
    () => missedContributionRows(ctx.data).filter((row) => row.contributionId === contributionId),
    [ctx.data, contributionId],
  )
  const commissions = useMemo(() => commissionReport(ctx.data, scoped), [ctx.data, scoped])

  const exportCurrent = () => {
    if (tab === "collections") {
      return downloadCsv("contribution-collections", ["Period", "Collected", "Movements"], collections.map((row) => [row.period ?? row.label, row.collected, row.contributors ?? 0]))
    }
    if (tab === "missed") {
      return downloadCsv("contribution-missed", ["Contributor", "Period", "Paid", "Outstanding"], missed.map((row) => [row.label, row.period ?? "", row.collected, row.balance]))
    }
    return downloadCsv("contribution-commissions", ["Reference", "Gross", "Commission", "Net payout", "Completed"], commissions.map((row) => [row.label, row.collected, row.commission, row.netPayout, row.period ?? ""]))
  }

  const totalCollected = collections.reduce((sum, row) => sum + row.collected, 0)
  const totalCommission = commissions.reduce((sum, row) => sum + row.commission, 0)

  return (
    <Panel
      title="Reports"
      subtitle={
        tab === "collections"
          ? `${money(totalCollected)} collected in this view`
          : tab === "missed"
            ? `${missed.length} ${missed.length === 1 ? "period" : "periods"} missed or late`
            : `${money(totalCommission)} commission charged`
      }
      actions={
        <div className="contribution-filters">
          <select value={tab} onChange={(event) => setTab(event.target.value as ReportTab)} aria-label="Report">
            <option value="collections">Collections</option>
            <option value="missed">{`Missed & late${missed.length ? ` (${missed.length})` : ""}`}</option>
            <option value="commissions">{`Commissions${commissions.length ? ` (${commissions.length})` : ""}`}</option>
          </select>
          {tab === "collections" && (
            <select value={granularity} onChange={(event) => setGranularity(event.target.value as Granularity)} aria-label="Group collections by">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          )}
          {ctx.can("contributions.export") && <Button variant="secondary" onClick={exportCurrent}>CSV / Excel</Button>}
        </div>
      }
    >
      {tab === "collections" && (
        <PagedTable
          rows={collections}
          rowKey={(row) => row.id}
          pageSize={10}
          emptyText="Nothing has been collected in this period."
          columns={[
            { id: "period", header: "Period", render: (row) => row.period ?? row.label },
            { id: "collected", header: "Collected", render: (row) => <b>{money(row.collected)}</b> },
            { id: "movements", header: "Contributions", render: (row) => row.contributors ?? 0 },
          ]}
        />
      )}

      {tab === "missed" && (
        <PagedTable
          rows={missed}
          rowKey={(row) => row.id}
          pageSize={10}
          emptyText="Every expected contribution was paid."
          columns={[
            { id: "who", header: "Contributor", render: (row) => row.label },
            { id: "period", header: "Period", render: (row) => (row.period ? fmtDate(row.period) : "—") },
            { id: "paid", header: "Paid", render: (row) => money(row.collected) },
            { id: "outstanding", header: "Outstanding", render: (row) => <span className="contribution-debit">{money(row.balance)}</span> },
          ]}
        />
      )}

      {tab === "commissions" && (
        <PagedTable
          rows={commissions}
          rowKey={(row) => row.id}
          pageSize={10}
          emptyText="No commission has been charged on this plan."
          columns={[
            { id: "reference", header: "Payout", render: (row) => <span className="mono">{row.label}</span> },
            { id: "gross", header: "Gross", render: (row) => money(row.collected) },
            { id: "commission", header: "Commission", render: (row) => money(row.commission) },
            { id: "net", header: "Net payout", render: (row) => <b>{money(row.netPayout)}</b> },
            { id: "completed", header: "Completed", render: (row) => (row.period ? fmtDate(row.period) : "—") },
          ]}
        />
      )}
    </Panel>
  )
}
