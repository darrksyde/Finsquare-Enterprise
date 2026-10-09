import { useState } from "react"
import { Plus } from "@/icons"
import { Button, Progress, SectionHeader } from "@/components/ui"
import { FilterBar, SearchInput } from "@/components/data-display/ManagementPrimitives"
import { LoanPage, PagedTable, Panel, StatusBadge, Tabs, fmtDate, money, type LoanPageProps } from "../components/LoanUi"
import type { LoanStatus } from "../types/loan.types"

type Tab = "Open" | LoanStatus | "All"
export function ActiveLoansPage(props: LoanPageProps) {
  const [tab, setTab] = useState<Tab>("Open")
  const [q, setQ] = useState("")
  return (
    <LoanPage {...props}>
      {({ data, can, navigate }) => {
        const match = (s: LoanStatus, t: Tab) => (t === "All" ? true : t === "Open" ? !["Completed", "Written Off"].includes(s) : s === t)
        const rows = data.loans.filter((l) => match(l.status, tab) && `${l.borrower.name} ${l.reference} ${l.productName}`.toLowerCase().includes(q.toLowerCase()))
        const tabs: Tab[] = ["Open", "Active", "Current", "Overdue", "Defaulted", "Completed", "Written Off", "All"]
        return (
          <>
            <SectionHeader eyebrow="LOANS" title="Active loans" description="Every disbursed loan, its balance and repayment health."
              actions={can("loan_products.create") && <Button icon={Plus} onClick={() => navigate("loan-type-create")}>Create loan type</Button>} />
            <Tabs value={tab} onChange={setTab} tabs={tabs.map((t) => ({ id: t, label: t === "Open" ? "All open" : t, count: data.loans.filter((l) => match(l.status, t)).length }))} />
            <Panel>
              <FilterBar><SearchInput value={q} onChange={setQ} placeholder="Search borrower, loan reference or product" /></FilterBar>
              <PagedTable rows={rows} rowKey={(l) => l.id} onRowClick={(l) => navigate("loan-detail", l.id)} emptyText="No loans in this view"
                columns={[
                  { id: "b", header: "Borrower", render: (l) => <><b>{l.borrower.name}</b><div style={{ color: "var(--muted)" }}>{l.reference}</div></> },
                  { id: "p", header: "Product", render: (l) => l.productName },
                  { id: "pr", header: "Principal", render: (l) => money(l.principal) },
                  { id: "o", header: "Outstanding", render: (l) => <b>{money(l.outstanding)}</b> },
                  { id: "r", header: "Repayment", render: (l) => `${money(l.installment)} / ${l.terms.frequency.toLowerCase()}` },
                  { id: "n", header: "Next repayment", render: (l) => (l.nextDueDate ? `${fmtDate(l.nextDueDate)}` : "—") },
                  { id: "g", header: "Progress", render: (l) => <div style={{ width: 90 }}><Progress value={(l.paid / l.totalRepayable) * 100} /></div> },
                  { id: "d", header: "Days overdue", render: (l) => (l.daysOverdue ? <span style={{ color: "var(--red-text)" }}>{l.daysOverdue}</span> : "0") },
                  { id: "s", header: "Status", render: (l) => <StatusBadge status={l.status} /> },
                ]} />
            </Panel>
          </>
        )
      }}
    </LoanPage>
  )
}
