import { printTable } from "@/features/wallet/domain/export"
import { useState } from "react"
import { SectionHeader } from "@/components/ui"
import { ExportButtons, LoanPage, PagedTable, Panel, Tabs, downloadCsv, fmtDate, money, type LoanPageProps } from "../components/LoanUi"
import type { LoanDataset } from "../types/loan.types"

type Rep = "portfolio" | "disbursements" | "repayments" | "outstanding" | "overdue" | "defaults" | "interest" | "fees" | "recovery" | "products"
type Table = { headers: string[]; rows: (string | number)[][] }
const sum = (a: number[]) => a.reduce((t, n) => t + n, 0)

function build(id: Rep, d: LoanDataset): Table {
  const L = d.loans
  const loanRow = (l: (typeof L)[number]) => [l.reference, l.borrower.name, l.productName, l.status, l.principal, l.outstanding, l.overdueAmount, l.daysOverdue]
  const lh = ["Loan", "Borrower", "Product", "Status", "Principal", "Outstanding", "Overdue amount", "Days overdue"]
  switch (id) {
    case "portfolio": return { headers: lh, rows: L.map(loanRow) }
    case "outstanding": return { headers: lh, rows: L.filter((l) => l.outstanding > 0).map(loanRow) }
    case "overdue": return { headers: lh, rows: L.filter((l) => l.status === "Overdue").map(loanRow) }
    case "defaults": return { headers: lh, rows: L.filter((l) => ["Defaulted", "Written Off"].includes(l.status)).map(loanRow) }
    case "disbursements": return { headers: ["Loan", "Borrower", "Date", "Amount", "Method"], rows: d.disbursements.map((x) => [x.reference, x.borrowerName, x.date, x.netAmount, x.method]) }
    case "repayments": return { headers: ["Reference", "Loan", "Borrower", "Date", "Amount", "Method", "Status"], rows: d.repayments.map((r) => [r.reference, r.loanReference, r.borrowerName, r.date, r.amount, r.method, r.status]) }
    case "interest": return { headers: ["Loan", "Borrower", "Total interest", "Interest collected"], rows: L.map((l) => [l.reference, l.borrower.name, l.interest, Math.min(l.interest, Math.max(0, l.paid - l.principal))]) }
    case "fees": return { headers: ["Loan", "Borrower", "Fees"], rows: L.map((l) => [l.reference, l.borrower.name, l.fees]) }
    case "recovery": return { headers: ["Borrower", "Opened", "Status", "Assigned to", "Actions logged"], rows: d.recoveryCases.map((c) => [L.find((l) => l.id === c.loanId)?.borrower.name ?? "", c.openedAt, c.status, c.assignedTo, c.notes.length]) }
    case "products": return {
      headers: ["Product", "Loans", "Disbursed", "Outstanding", "Overdue", "Overdue rate"],
      rows: d.products.map((p) => {
        const ls = L.filter((l) => l.productId === p.id)
        const out = sum(ls.map((l) => l.outstanding)), ov = sum(ls.map((l) => l.overdueAmount))
        return [p.name, ls.length, sum(ls.map((l) => l.principal)), out, ov, out ? `${((ov / out) * 100).toFixed(1)}%` : "0%"]
      }),
    }
  }
}

const tabs: { id: Rep; label: string }[] = [
  { id: "portfolio", label: "Portfolio" }, { id: "disbursements", label: "Disbursements" }, { id: "repayments", label: "Repayments" }, { id: "outstanding", label: "Outstanding" }, { id: "overdue", label: "Overdue" },
  { id: "defaults", label: "Defaults" }, { id: "interest", label: "Interest" }, { id: "fees", label: "Fees" }, { id: "recovery", label: "Recovery" }, { id: "products", label: "By product" },
]

export function LoanReportsPage(props: LoanPageProps & { embedded?: boolean }) {
  const [tab, setTab] = useState<Rep>("portfolio")
  return (
    <LoanPage {...props} bare={props.embedded}>
      {({ data, can, notify }) => {
        const t = build(tab, data)
        const cell = (v: string | number, h: string) =>
          typeof v === "number" && !/days|loans|actions/i.test(h) ? money(v) : /date|opened/i.test(h) && typeof v === "string" ? fmtDate(v) : v
        return (
          <>
            {(() => {
              const exportButtons = can("loans.export") && <ExportButtons onCsv={() => { downloadCsv(`loan-${tab}`, t.headers, t.rows); notify("CSV exported") }} onPdf={() => printTable(`Loan report — ${tab}`, t.headers, t.rows)} />
              return props.embedded
                ? <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 10 }}>{exportButtons}</div>
                : <SectionHeader eyebrow="LOANS" title="Loan reports" description="Portfolio performance computed from current loan data." actions={exportButtons} />
            })()}
            <Tabs value={tab} onChange={setTab} tabs={tabs} />
            <Panel title={tabs.find((x) => x.id === tab)!.label} subtitle={`${t.rows.length} records`}>
              <PagedTable rows={t.rows} rowKey={(r) => r.join("|")} pageSize={10}
                columns={t.headers.map((h, i) => ({ id: h, header: h, render: (r: (string | number)[]) => cell(r[i], h) }))} />
            </Panel>
          </>
        )
      }}
    </LoanPage>
  )
}
