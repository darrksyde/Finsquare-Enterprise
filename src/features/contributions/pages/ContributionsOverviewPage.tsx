import { useMemo, useState } from "react"
import { Plus } from "@/icons"
import { Button } from "@/components/ui"
import { SearchInput } from "@/components/data-display/ManagementPrimitives"
import { ShellPage } from "@/components/layout/ShellPage"
import type { AttentionItem } from "@/components/feedback/AttentionStrip"
import { EnvironmentNotice } from "@/components/feedback/EnvironmentNotice"
import { CONTRIBUTION_FORMS, CONTRIBUTION_TYPES } from "../types/contribution.types"
import {
  ContributionFormBadge,
  ContributionPage,
  ContributionStatusBadge,
  ContributionTypeBadge,
  FrequencyBadge,
  PagedTable,
  Panel,
} from "../components/ContributionUi"
import { money } from "@/features/loans/components/LoanUi"
import { recipientHolderName } from "../domain/contribution.rules"
import type { ContributionCtx, ContributionPageProps } from "../components/ContributionUi"

/**
 * The module front door: what needs an administrator, then every plan in one list.
 * Money detail lives inside the plan that owns it.
 */
export default function ContributionsOverviewPage(props: ContributionPageProps) {
  return <ContributionPage {...props}>{(ctx) => <FrontDoor ctx={ctx} />}</ContributionPage>
}

function FrontDoor({ ctx }: { ctx: ContributionCtx }) {
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("All")
  const [type, setType] = useState("All")
  const [form, setForm] = useState("All")

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return ctx.contributions
      .filter((plan) => (status === "All" ? true : plan.status === status))
      .filter((plan) => (type === "All" ? true : plan.type === type))
      .filter((plan) => (form === "All" ? true : plan.form === form))
      .filter((plan) =>
        needle
          ? plan.name.toLowerCase().includes(needle) ||
            recipientHolderName(plan.recipient).toLowerCase().includes(needle) ||
            (plan.groupName ?? "").toLowerCase().includes(needle)
          : true,
      )
  }, [ctx.contributions, status, type, form, query])

  const totals = ctx.contributions.reduce(
    (acc, plan) => {
      const balance = ctx.balanceFor(plan)
      return {
        collected: acc.collected + balance.totalContributed,
        available: acc.available + balance.availableBalance,
        active: acc.active + (plan.status === "Active" ? 1 : 0),
      }
    },
    { collected: 0, available: 0, active: 0 },
  )

  const attention = useMemo<AttentionItem[]>(() => {
    const items: AttentionItem[] = []
    for (const plan of ctx.contributions) {
      const payouts = ctx.withdrawalsFor(plan.id).filter((w) => w.status === "Pending approval")
      if (payouts.length > 0) {
        const net = payouts.reduce((sum, w) => sum + w.netPayout, 0)
        items.push({
          id: `${plan.id}-payouts`,
          label: plan.name,
          detail: `${payouts.length} payout${payouts.length === 1 ? "" : "s"} to approve · ${money(net)}`,
          tone: "amber",
          onSelect: () => ctx.navigate("contribution-detail", plan.id),
        })
      }
    }
    for (const plan of ctx.contributions) {
      const behind = ctx.participantsFor(plan.id).filter((p) => p.state === "Behind")
      if (behind.length > 0) {
        items.push({
          id: `${plan.id}-behind`,
          label: plan.name,
          detail: `${behind.length} contributor${behind.length === 1 ? "" : "s"} behind`,
          tone: "red",
          onSelect: () => ctx.navigate("contribution-detail", plan.id),
        })
      }
    }
    return items.slice(0, 4)
  }, [ctx])

  return (
    <ShellPage
      level="index"
      title="Contributions"
      description="Every collection plan, and what needs you first."
      attention={attention}
      actions={
        ctx.can("contributions.create") ? (
          <Button icon={Plus} onClick={() => ctx.navigate("contribution-create")}>
            Create contribution
          </Button>
        ) : undefined
      }
    >
      <EnvironmentNotice mode={ctx.mode} />

      <Panel
        title="Plans"
        subtitle={`${totals.active} active of ${ctx.contributions.length} · ${money(totals.collected)} collected · ${money(totals.available)} available`}
        actions={
          <div className="contribution-filters">
            <SearchInput value={query} onChange={setQuery} placeholder="Search plan, group or holder" />
            <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
              {["All", "Active", "Paused", "Completed", "Closed"].map((option) => (
                <option key={option} value={option}>{option === "All" ? "Any status" : option}</option>
              ))}
            </select>
            <select value={type} onChange={(event) => setType(event.target.value)} aria-label="Filter by type">
              <option value="All">Any type</option>
              {CONTRIBUTION_TYPES.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            <select value={form} onChange={(event) => setForm(event.target.value)} aria-label="Filter by form">
              <option value="All">General and Personal</option>
              {CONTRIBUTION_FORMS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
        }
      >
        <PagedTable
          rows={rows}
          rowKey={(row) => row.id}
          pageSize={10}
          emptyText="No plans match these filters."
          onRowClick={(row) => ctx.navigate("contribution-detail", row.id)}
          columns={[
            {
              id: "name",
              header: "Contribution",
              render: (row) => (
                <>
                  <b>{row.name}</b>
                  <div className="contribution-meta-inline">
                    <ContributionFormBadge form={row.form} />
                    <FrequencyBadge contribution={row} />
                  </div>
                </>
              ),
            },
            { id: "type", header: "Type", render: (row) => <ContributionTypeBadge type={row.type} /> },
            { id: "holder", header: "Held for", render: (row) => <span className="contribution-sub">{recipientHolderName(row.recipient)}</span> },
            { id: "contributors", header: "Contributors", render: (row) => ctx.participantsFor(row.id).length },
            { id: "collected", header: "Collected", render: (row) => money(ctx.balanceFor(row).totalContributed) },
            { id: "available", header: "Available", render: (row) => <b>{money(ctx.balanceFor(row).availableBalance)}</b> },
            { id: "status", header: "Status", render: (row) => <ContributionStatusBadge status={row.status} /> },
          ]}
        />
      </Panel>
    </ShellPage>
  )
}
