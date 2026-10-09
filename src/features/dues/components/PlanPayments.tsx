import { useMemo, useState } from "react"
import { SearchInput } from "@/components/data-display/ManagementPrimitives"
import { Button } from "@/components/ui"
import { ChargeStatusBadge, LienStateBadge, PagedTable, Panel } from "./DuesUi"
import { fmtDate, money } from "@/features/loans/components/LoanUi"
import { outstandingOf } from "../domain/dues.rules"
import type { DuesCtx } from "./DuesUi"
import type { DuesPlan } from "../types/dues.types"
type View = "Outstanding" | "Overdue" | "Awaiting wallet recovery" | "Paid" | "All"
/**
 * The charge ledger: every expected payment, one row each.
 *
 * A charge that is not due yet stays `Pending` and is not counted as outstanding anywhere — the
 * schedule exists so a plan can be read ahead of time, not so it can demand money early.
 */
export function PlanPayments({
  ctx,
  plan,
  onRecordPayment,
}: {
  ctx: DuesCtx
  plan: DuesPlan
  onRecordPayment: (participantId: string, chargeId: string) => void
}) {
  const [query, setQuery] = useState("")
  const [view, setView] = useState<View>("Outstanding")
  const charges = ctx.syncedChargesFor(plan)
  const participants = new Map(ctx.participantsFor(plan.id).map((participant) => [participant.id, participant]))
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return charges
      .map((charge) => ({
        charge,
        status: ctx.statusFor(charge, plan),
        participant: participants.get(charge.participantId),
      }))
      .filter(({ charge, participant, status }) => {
        if (view === "Paid" && status !== "Paid") return false
        if (view === "Overdue" && status !== "Overdue" && status !== "Awaiting wallet recovery") return false
        if (view === "Awaiting wallet recovery" && status !== "Awaiting wallet recovery") return false
        if (view === "Outstanding" && outstandingOf(charge) <= 0) return false
        if (!needle) return true
        return (
          (participant?.memberName ?? "").toLowerCase().includes(needle) ||
          charge.periodKey.toLowerCase().includes(needle)
        )
      })
      .sort((a, b) => b.charge.dueDate.localeCompare(a.charge.dueDate))
    // `participants` is rebuilt every render from the same dataset, so the memo keys on the source.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charges, plan, query, view, ctx.data])
  return (
    <Panel
      title="Payments"
      subtitle={`${charges.length} scheduled charges · ${money(charges.reduce((sum, charge) => sum + outstandingOf(charge), 0))} still outstanding`}
      actions={
        <div className="contribution-filters">
          <SearchInput value={query} onChange={setQuery} placeholder="Search member or period" />
          <select value={view} onChange={(event) => setView(event.target.value as View)} aria-label="Filter charges">
            <option value="Outstanding">Outstanding</option>
            <option value="Overdue">Overdue</option>
            <option value="Awaiting wallet recovery">Awaiting wallet recovery</option>
            <option value="Paid">Paid</option>
            <option value="All">Everything</option>
          </select>
        </div>
      }
    >
      <PagedTable
        rows={rows}
        rowKey={(row) => row.charge.id}
        pageSize={12}
        emptyText="No charge matches this view."
        columns={[
          {
            id: "member",
            header: "Member",
            render: (row) => (
              <>
                <b>{row.participant?.memberName ?? row.charge.memberId}</b>
                {row.participant?.branchName && <div className="contribution-sub">{row.participant.branchName}</div>}
              </>
            ),
          },
          {
            id: "period",
            header: "Period",
            render: (row) => (
              <>
                <span className="mono">{row.charge.periodKey}</span>
                <div className="contribution-sub">due {fmtDate(row.charge.dueDate)}</div>
              </>
            ),
          },
          {
            id: "expected",
            header: "Expected",
            render: (row) => money(row.charge.expectedAmount),
          },
          {
            id: "paid",
            header: "Paid",
            render: (row) => money(row.charge.paidAmount),
          },
          {
            id: "outstanding",
            header: "Outstanding",
            render: (row) => (outstandingOf(row.charge) > 0 ? <b>{money(outstandingOf(row.charge))}</b> : money(0)),
          },
          {
            id: "status",
            header: "Status",
            render: (row) => <ChargeStatusBadge status={row.status} />,
          },
          {
            id: "lien",
            header: "Wallet lien",
            render: (row) => <LienStateBadge state={row.charge.lienState} />,
          },
          {
            id: "actions",
            header: "",
            render: (row) =>
              outstandingOf(row.charge) > 0 && ctx.can("dues.record_payment") ? (
                <Button variant="secondary" onClick={() => onRecordPayment(row.charge.participantId, row.charge.id)}>
                  Record payment
                </Button>
              ) : null,
          },
        ]}
      />
    </Panel>
  )
}
