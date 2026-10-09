import { useMemo, useState } from "react"
import { SearchInput } from "@/components/data-display/ManagementPrimitives"
import { Button, Disclosure } from "@/components/ui"
import { PagedTable, Panel, WithdrawalStatusBadge } from "./ContributionUi"
import { fmtDate, money } from "@/features/loans/components/LoanUi"
import type { ContributionCtx } from "./ContributionUi"
import type { ContributionTransaction, ContributionWithdrawal } from "../types/contribution.types"

interface Movement {
  id: string
  date: string
  reference: string
  what: string
  who: string
  amount: number
  direction: "in" | "out" | "pending"
  status: string
  detail: string
  withdrawal?: ContributionWithdrawal
}

type Filter = "all" | "in" | "out"

/**
 * One chronological list of everything that moved on this plan. Transactions and
 * payouts are the same question asked twice, so they share a list instead of a
 * tab each.
 */
export function PlanActivity({
  ctx,
  contributionId,
  onApprove,
  onReject,
}: {
  ctx: ContributionCtx
  contributionId: string
  onApprove: (withdrawal: ContributionWithdrawal) => void
  onReject: (withdrawal: ContributionWithdrawal) => void
}) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")

  const canApprove = ctx.can("contributions.approve_withdrawal")

  const movements = useMemo<Movement[]>(() => {
    const transactions = ctx.data.transactions.filter((tx) => tx.contributionId === contributionId)
    const withdrawals = ctx.data.withdrawals.filter((w) => w.contributionId === contributionId)
    const fromTransactions: Movement[] = transactions.map((tx: ContributionTransaction) => ({
      id: tx.id,
      date: tx.date,
      reference: tx.reference,
      what: tx.type,
      who: tx.contributorName,
      amount: tx.amount,
      direction: tx.direction === "credit" ? "in" : "out",
      status: tx.status,
      detail: tx.method.replace("_", " "),
    }))
    const fromWithdrawals: Movement[] = withdrawals.map((w: ContributionWithdrawal) => ({
      id: w.id,
      date: w.completedAt ?? w.scheduledFor ?? w.requestedAt,
      reference: w.reference,
      what: `Payout · ${w.kind}`,
      who: w.destination,
      amount: w.netPayout,
      direction: w.status === "Completed" ? "out" : "pending",
      status: w.status,
      detail: w.requestedBy,
      withdrawal: w,
    }))
    return [...fromTransactions, ...fromWithdrawals].sort((a, b) => b.date.localeCompare(a.date))
  }, [ctx.data, contributionId])

  const pendingApprovals = useMemo(
    () => movements.flatMap((movement) => (movement.withdrawal?.status === "Pending approval" ? [movement.withdrawal] : [])),
    [movements],
  )

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return movements
      .filter((m) => (filter === "all" ? true : filter === "in" ? m.direction === "in" : m.direction === "out"))
      .filter((m) =>
        needle
          ? m.reference.toLowerCase().includes(needle) ||
            m.who.toLowerCase().includes(needle) ||
            m.what.toLowerCase().includes(needle)
          : true,
      )
  }, [movements, filter, query])

  const received = movements.filter((m) => m.direction === "in").reduce((sum, m) => sum + m.amount, 0)
  const paidOut = movements.filter((m) => m.direction === "out").reduce((sum, m) => sum + m.amount, 0)

  return (
    <Panel
      title="Activity"
      subtitle={`${money(received)} received · ${money(paidOut)} paid out`}
      actions={
        <div className="contribution-filters">
          <SearchInput value={query} onChange={setQuery} placeholder="Search reference or person" />
          <select value={filter} onChange={(event) => setFilter(event.target.value as Filter)} aria-label="Filter movements">
            <option value="all">All movements</option>
            <option value="in">Money in</option>
            <option value="out">Money out</option>
          </select>
        </div>
      }
    >
      <PagedTable
        rows={rows}
        rowKey={(row) => row.id}
        pageSize={12}
        emptyText="Nothing has moved on this plan yet."
        columns={[
          {
            id: "date",
            header: "Date",
            render: (row) => (
              <>
                <b>{fmtDate(row.date)}</b>
                <div className="contribution-sub mono">{row.reference}</div>
              </>
            ),
          },
          { id: "what", header: "What", render: (row) => row.what },
          { id: "who", header: "Who", render: (row) => <span className="contribution-sub">{row.who}</span> },
          {
            id: "amount",
            header: "Amount",
            render: (row) => (
              <span className={row.direction === "in" ? "contribution-credit" : row.direction === "out" ? "contribution-debit" : ""}>
                {row.direction === "in" ? "+" : row.direction === "out" ? "−" : ""}
                {money(row.amount)}
              </span>
            ),
          },
          {
            id: "status",
            header: "Status",
            render: (row) =>
              row.withdrawal ? <WithdrawalStatusBadge status={row.withdrawal.status} /> : <StatusText status={row.status} />,
          },
          ...(pendingApprovals.length > 0 && canApprove
            ? [
                {
                  id: "actions",
                  header: "",
                  render: (row: Movement) =>
                    row.withdrawal && row.withdrawal.status === "Pending approval" && row.withdrawal.requestedById !== ctx.actor.id ? (
                      <div className="contribution-row-actions">
                        <Button variant="secondary" onClick={() => onReject(row.withdrawal as ContributionWithdrawal)}>Reject</Button>
                        <Button onClick={() => onApprove(row.withdrawal as ContributionWithdrawal)}>Approve</Button>
                      </div>
                    ) : null,
                },
              ]
            : []),
        ]}
      />

      {pendingApprovals.length > 0 && (
        <Disclosure label={`${pendingApprovals.length} payout${pendingApprovals.length === 1 ? "" : "s"} waiting on a second approver`}>
          <ul className="person-list">
            {pendingApprovals.map((w) => (
              <li key={w.id}>
                <span className="person-line">
                  <span className="person-name mono">{w.reference}</span>
                  <span className="person-metric">{money(w.grossAmount)} gross</span>
                  <span className="person-metric">{money(w.commission)} commission</span>
                  <span className="person-metric person-hide">requested by {w.requestedBy}</span>
                  <WithdrawalStatusBadge status={w.status} />
                </span>
              </li>
            ))}
          </ul>
          <p className="contribution-hint">A payout above this plan&apos;s approval threshold needs a different administrator.</p>
        </Disclosure>
      )}
    </Panel>
  )
}

function StatusText({ status }: { status: string }) {
  return <span className={status === "Completed" ? "" : "contribution-sub"}>{status}</span>
}
