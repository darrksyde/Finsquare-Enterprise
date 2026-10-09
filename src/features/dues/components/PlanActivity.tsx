import { useMemo, useState } from "react"
import { SearchInput } from "@/components/data-display/ManagementPrimitives"
import { ExportButtons, PagedTable, Panel } from "./DuesUi"
import { downloadCsv, fmtDate, money } from "@/features/loans/components/LoanUi"
import { printTable } from "@/features/wallet/domain/export"
import { DUES_PAYMENT_METHOD_LABELS, DUES_TRANSACTION_TYPES } from "../types/dues.types"
import type { DuesCtx } from "./DuesUi"
import type { DuesPlan } from "../types/dues.types"
type TypeFilter = "All" | (typeof DUES_TRANSACTION_TYPES)[number]
/** Everything that moved on this plan, in one chronological list. */
export function PlanActivity({ ctx, plan }: { ctx: DuesCtx; plan: DuesPlan }) {
  const [query, setQuery] = useState("")
  const [type, setType] = useState<TypeFilter>("All")
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return ctx
      .transactionsFor(plan.id)
      .filter((transaction) => (type === "All" ? true : transaction.type === type))
      .filter((transaction) =>
        needle
          ? transaction.reference.toLowerCase().includes(needle) ||
            transaction.memberName.toLowerCase().includes(needle) ||
            (transaction.periodKey ?? "").toLowerCase().includes(needle)
          : true,
      )
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [ctx, plan.id, query, type])
  const received = ctx
    .transactionsFor(plan.id)
    .filter((transaction) => transaction.status === "Completed")
    .reduce((sum, transaction) => sum + transaction.amount, 0)
  const recovered = ctx
    .transactionsFor(plan.id)
    .filter((transaction) => transaction.type === "Wallet recovery" && transaction.status === "Completed")
    .reduce((sum, transaction) => sum + transaction.amount, 0)
  const csvRows = () =>
    rows.map((row) => [
      row.date.slice(0, 10),
      row.reference,
      row.memberName,
      row.type,
      DUES_PAYMENT_METHOD_LABELS[row.method],
      row.periodKey ?? "",
      row.amount,
      row.status,
      row.recordedBy,
    ])
  return (
    <Panel
      title="Activity"
      subtitle={`${money(received)} received · ${money(recovered)} recovered from wallets`}
      actions={
        <div className="contribution-filters">
          <SearchInput value={query} onChange={setQuery} placeholder="Search reference or member" />
          <select
            value={type}
            onChange={(event) => setType(event.target.value as TypeFilter)}
            aria-label="Filter movements"
          >
            <option value="All">All movements</option>
            {DUES_TRANSACTION_TYPES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <ExportButtons
            disabled={rows.length === 0}
            onCsv={() =>
              downloadCsv(
                "dues-activity",
                ["Date", "Reference", "Member", "Type", "Method", "Period", "Amount", "Status", "Recorded by"],
                csvRows(),
              )
            }
            onPdf={() =>
              printTable(
                `${plan.name} — dues activity`,
                ["Date", "Reference", "Member", "Type", "Method", "Period", "Amount", "Status", "Recorded by"],
                csvRows(),
              )
            }
          />
        </div>
      }
    >
      <PagedTable
        rows={rows}
        rowKey={(row) => row.id}
        pageSize={12}
        emptyText="Nothing has been collected on this plan yet."
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
          { id: "member", header: "Member", render: (row) => row.memberName },
          {
            id: "what",
            header: "What",
            render: (row) => (
              <>
                {row.type}
                {row.periodKey && <div className="contribution-sub">{row.periodKey}</div>}
              </>
            ),
          },
          {
            id: "method",
            header: "Method",
            render: (row) => <span className="contribution-sub">{DUES_PAYMENT_METHOD_LABELS[row.method]}</span>,
          },
          {
            id: "amount",
            header: "Amount",
            render: (row) => <span className="contribution-credit">+{money(row.amount)}</span>,
          },
          {
            id: "status",
            header: "Status",
            render: (row) => (
              <>
                <span className={row.status === "Completed" ? "" : "contribution-sub"}>{row.status}</span>
                {row.note && row.status === "Failed" && <div className="contribution-sub">{row.note}</div>}
              </>
            ),
          },
        ]}
      />
    </Panel>
  )
}
