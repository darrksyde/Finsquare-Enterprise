import { useMemo, useState } from "react"
import { SearchInput } from "@/components/data-display/ManagementPrimitives"
import { Button } from "@/components/ui"
import { PagedTable, Panel, ParticipantStateBadge } from "./DuesUi"
import { money } from "@/features/loans/components/LoanUi"
import type { DuesCtx } from "./DuesUi"
import type { DuesPlan } from "../types/dues.types"
type StateFilter = "All" | "Owing" | "Paid up" | "Awaiting wallet recovery"
/**
 * Who pays in, and where each of them stands.
 *
 * The figures come from the charge ledger, not from a stored total, so a row can never go stale
 * after a payment or a recovery.
 */
export function PlanParticipants({
  ctx,
  plan,
  onRecordPayment,
  onRecover,
}: {
  ctx: DuesCtx
  plan: DuesPlan
  onRecordPayment: (participantId: string) => void
  onRecover: (memberId: string, memberName: string) => void
}) {
  const [query, setQuery] = useState("")
  const [state, setState] = useState<StateFilter>("All")
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return ctx
      .participantsFor(plan.id)
      .map((participant) => ({
        participant,
        totals: ctx.participantTotalsFor(participant),
      }))
      .filter(({ participant, totals }) => {
        if (state === "Owing" && totals.outstanding <= 0) return false
        if (state === "Paid up" && totals.outstanding > 0) return false
        if (state === "Awaiting wallet recovery" && totals.awaitingRecoveryCount === 0) return false
        if (!needle) return true
        return (
          participant.memberName.toLowerCase().includes(needle) ||
          (participant.memberCode ?? "").toLowerCase().includes(needle) ||
          (participant.branchName ?? "").toLowerCase().includes(needle)
        )
      })
      .sort(
        (a, b) =>
          b.totals.outstanding - a.totals.outstanding ||
          a.participant.memberName.localeCompare(b.participant.memberName),
      )
  }, [ctx, plan.id, query, state])
  const owing = ctx
    .participantsFor(plan.id)
    .filter((participant) => ctx.participantTotalsFor(participant).outstanding > 0).length
  return (
    <Panel
      title="Participants"
      subtitle={`${ctx.participantsFor(plan.id).length} on this plan · ${owing} still owing`}
      actions={
        <div className="contribution-filters">
          <SearchInput value={query} onChange={setQuery} placeholder="Search member or branch" />
          <select
            value={state}
            onChange={(event) => setState(event.target.value as StateFilter)}
            aria-label="Filter participants"
          >
            <option value="All">Everyone</option>
            <option value="Owing">Still owing</option>
            <option value="Paid up">Paid up</option>
            <option value="Awaiting wallet recovery">Awaiting wallet recovery</option>
          </select>
        </div>
      }
    >
      <PagedTable
        rows={rows}
        rowKey={(row) => row.participant.id}
        pageSize={12}
        emptyText="Nobody matches these filters."
        onRowClick={(row) => ctx.navigate("member-profile", row.participant.memberId)}
        columns={[
          {
            id: "member",
            header: "Member",
            render: (row) => (
              <>
                <b>{row.participant.memberName}</b>
                <div className="contribution-meta-inline">
                  <span className="contribution-sub mono">
                    {row.participant.memberCode ?? row.participant.memberId}
                  </span>
                  {row.participant.branchName && <span className="contribution-sub">{row.participant.branchName}</span>}
                </div>
              </>
            ),
          },
          {
            id: "paid",
            header: "Paid",
            render: (row) => money(row.totals.paid),
          },
          {
            id: "outstanding",
            header: "Outstanding",
            render: (row) => (row.totals.outstanding > 0 ? <b>{money(row.totals.outstanding)}</b> : money(0)),
          },
          {
            id: "overdue",
            header: "Overdue",
            render: (row) =>
              row.totals.overdueAmount > 0 ? (
                money(row.totals.overdueAmount)
              ) : (
                <span className="contribution-sub">—</span>
              ),
          },
          {
            id: "state",
            header: "Status",
            render: (row) => <ParticipantStateBadge state={row.totals.state} />,
          },
          {
            id: "actions",
            header: "",
            render: (row) => (
              <div className="contribution-row-actions" onClick={(event) => event.stopPropagation()}>
                {row.totals.outstanding > 0 && ctx.can("dues.record_payment") && (
                  <Button variant="secondary" onClick={() => onRecordPayment(row.participant.id)}>
                    Record payment
                  </Button>
                )}
                {row.totals.awaitingRecoveryCount > 0 && ctx.can("dues.recover") && (
                  <Button onClick={() => onRecover(row.participant.memberId, row.participant.memberName)}>
                    Recover
                  </Button>
                )}
              </div>
            ),
          },
        ]}
      />
    </Panel>
  )
}
