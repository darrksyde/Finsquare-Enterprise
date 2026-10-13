import { useMemo, useState } from "react"
import { Plus } from "@/icons"
import { Button } from "@/components/ui"
import { SearchInput } from "@/components/data-display/ManagementPrimitives"
import { ShellPage } from "@/components/layout/ShellPage"
import type { AttentionItem } from "@/components/feedback/AttentionStrip"
import { EnvironmentNotice } from "@/components/feedback/EnvironmentNotice"
import {
  DuesFrequencyBadge,
  DuesPage,
  DuesStatusBadge,
  PagedTable,
  Panel,
  Stats,
} from "../components/DuesUi"
import { money } from "@/features/loans/components/LoanUi"
import { DUES_FREQUENCIES, DUES_PLAN_STATUSES } from "../types/dues.types"
import { scopeLabel } from "../domain/dues.rules"
import type { DuesCtx, DuesPageProps } from "../components/DuesUi"
/**
 * The module front door: how the organization's dues stand, then every plan in one list.
 * Everything that belongs to one plan lives inside that plan.
 */
export default function DuesOverviewPage(props: DuesPageProps) {
  return <DuesPage {...props}>{(ctx) => <FrontDoor ctx={ctx} />}</DuesPage>
}
function FrontDoor({ ctx }: { ctx: DuesCtx }) {
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("All")
  const [frequency, setFrequency] = useState("All")
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return ctx.plans
      .filter((plan) => (status === "All" ? true : plan.status === status))
      .filter((plan) => (frequency === "All" ? true : plan.frequency === frequency))
      .filter((plan) =>
        needle
          ? plan.name.toLowerCase().includes(needle) ||
            (plan.groupName ?? "").toLowerCase().includes(needle) ||
            (plan.branchName ?? "").toLowerCase().includes(needle)
          : true,
      )
  }, [ctx.plans, status, frequency, query])
  const summary = ctx.summary
  const attention = useMemo<AttentionItem[]>(() => {
    const items: AttentionItem[] = []
    for (const plan of ctx.plans) {
      const totals = ctx.totalsFor(plan)
      if (totals.awaitingRecovery > 0) {
        items.push({
          id: `${plan.id}-recovery`,
          label: plan.name,
          detail: `${totals.awaitingRecovery} ${totals.awaitingRecovery === 1 ? "due is" : "dues are"} awaiting wallet recovery`,
          tone: "amber",
          onSelect: () => ctx.navigate("dues-detail", plan.id),
        })
      }
      if (totals.unpaidParticipants > 0) {
        items.push({
          id: `${plan.id}-unpaid`,
          label: plan.name,
          detail: `${totals.unpaidParticipants} ${totals.unpaidParticipants === 1 ? "member" : "members"} still owing ${money(totals.outstanding)}`,
          tone: "red",
          onSelect: () => ctx.navigate("dues-detail", plan.id),
        })
      }
    }
    return items.slice(0, 4)
  }, [ctx])
  return (
    <ShellPage
      level="index"
      title="Dues"
      description="What members owe, what has been collected, and what is still outstanding."
      attention={attention}
      actions={
        ctx.can("dues.create") ? (
          <Button icon={Plus} onClick={() => ctx.navigate("dues-create")}>
            Create dues plan
          </Button>
        ) : undefined
      }
    >
      <EnvironmentNotice mode={ctx.mode} />

      {summary && (
        <Stats
          items={[
            {
              label: "Collected",
              value: money(summary.totalCollected),
              detail: `${summary.activePlans} active ${summary.activePlans === 1 ? "plan" : "plans"}`,
            },
            {
              label: "Outstanding",
              value: money(summary.outstandingAmount),
              detail: "Payable now",
            },
            {
              label: "Overdue",
              value: money(summary.overdueAmount),
              tone: summary.overdueAmount > 0 ? "red" : undefined,
              detail: `${summary.awaitingRecovery} awaiting wallet recovery`,
            },
            {
              label: "Members",
              value: `${summary.paidMembers} paid · ${summary.unpaidMembers} owing`,
              detail: `${summary.totalParticipants} on ${summary.activePlans} active ${summary.activePlans === 1 ? "plan" : "plans"}`,
            },
          ]}
        />
      )}

      <Panel
        title="Dues plans"
        subtitle={`${rows.length} of ${ctx.plans.length} shown · ${summary ? money(summary.totalCollected) : money(0)} collected in total`}
        actions={
          <div className="contribution-filters">
            <SearchInput value={query} onChange={setQuery} placeholder="Search plan, group or branch" />
            <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
              <option value="All">Any status</option>
              {DUES_PLAN_STATUSES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              value={frequency}
              onChange={(event) => setFrequency(event.target.value)}
              aria-label="Filter by frequency"
            >
              <option value="All">Any frequency</option>
              {DUES_FREQUENCIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        }
      >
        <PagedTable
          rows={rows}
          rowKey={(row) => row.id}
          pageSize={10}
          emptyText="No dues plan matches these filters."
          onRowClick={(row) => ctx.navigate("dues-detail", row.id)}
          columns={[
            {
              id: "name",
              header: "Plan",
              render: (row) => (
                <>
                  <b>{row.name}</b>
                  <div className="contribution-meta-inline">
                    <DuesFrequencyBadge plan={row} />
                    <span className="contribution-sub">{scopeLabel(row, ctx.participantsFor(row.id))}</span>
                  </div>
                </>
              ),
            },
            {
              id: "amount",
              header: "Amount",
              render: (row) => money(row.amount),
            },
            {
              id: "participants",
              header: "Participants",
              render: (row) => ctx.totalsFor(row).participants,
            },
            {
              id: "collected",
              header: "Collected",
              render: (row) => money(ctx.totalsFor(row).collected),
            },
            {
              id: "outstanding",
              header: "Outstanding",
              render: (row) => {
                const totals = ctx.totalsFor(row)
                return totals.outstanding > 0 ? (
                  <b>{money(totals.outstanding)}</b>
                ) : (
                  <span className="contribution-sub">Nothing due</span>
                )
              },
            },
            {
              id: "status",
              header: "Status",
              render: (row) => <DuesStatusBadge status={row.status} />,
            },
          ]}
        />
      </Panel>
    </ShellPage>
  )
}
