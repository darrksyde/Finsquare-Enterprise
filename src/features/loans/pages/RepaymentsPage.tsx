import { useState } from "react"
import { Plus } from "@/icons"
import { Button, SectionHeader } from "@/components/ui"
import { FilterBar, SearchInput } from "@/components/data-display/ManagementPrimitives"
import { todayISO } from "../domain/calculations"
import { RecordRepaymentModal } from "../components/RecordRepaymentModal"
import { ActionModal, KV, LoanPage, PagedTable, Panel, StatusBadge, Stats, Tabs, compactMoney, fmtDate, money, type LoanPageProps } from "../components/LoanUi"
import type { LoanRepayment } from "../types/loan.types"

export function RepaymentsPage(props: LoanPageProps) {
  const [tab, setTab] = useState<"payments" | "due">("payments")
  const [q, setQ] = useState("")
  const [method, setMethod] = useState("All methods")
  const [rec, setRec] = useState(false)
  const [view, setView] = useState<LoanRepayment | null>(null)
  return (
    <LoanPage {...props}>
      {(ctx) => {
        const { data, can, navigate } = ctx
        const today = todayISO()
        const ok = data.repayments.filter((r) => r.status === "Confirmed")
        const dueItems = data.loans.flatMap((l) => l.schedule.filter((s) => ["Due", "Overdue", "Partially Paid"].includes(s.status) && s.dueDate <= today).map((s) => ({ l, s })))
        const pendingAmt = data.loans.filter((l) => l.nextDueDate).reduce((t, l) => t + l.nextDueAmount, 0)
        const rows = data.repayments.filter((r) => (method === "All methods" || r.method === method) && `${r.borrowerName} ${r.loanReference} ${r.reference}`.toLowerCase().includes(q.toLowerCase()))
        return (
          <>
            <SectionHeader eyebrow="LOANS" title="Repayments" description="Collections, payment history and repayments awaiting collection."
              actions={can("loans.repay") && <Button icon={Plus} onClick={() => setRec(true)}>Record repayment</Button>} />
            <Stats items={[
              { label: "Total collected", value: compactMoney(ok.reduce((t, r) => t + r.amount, 0)), detail: `${ok.length} payments` },
              { label: "Pending repayments", value: compactMoney(pendingAmt), detail: "Next installment per open loan" },
              { label: "Overdue repayments", value: compactMoney(data.loans.reduce((t, l) => t + l.overdueAmount, 0)), tone: "amber", detail: `${dueItems.filter((d) => d.s.status !== "Due").length} installments` },
              { label: "Today's collections", value: money(ok.filter((r) => r.date === today).reduce((t, r) => t + r.amount, 0)), detail: `${ok.filter((r) => r.date === today).length} payments today` },
            ]} />
            <Tabs value={tab} onChange={setTab} tabs={[{ id: "payments", label: "Payment history", count: data.repayments.length }, { id: "due", label: "Due & overdue", count: dueItems.length }]} />
            <Panel>
              {tab === "payments" ? (
                <>
                  <FilterBar>
                    <SearchInput value={q} onChange={setQ} placeholder="Search borrower, loan or reference" />
                    <div className="management-filters"><select value={method} onChange={(e) => setMethod(e.target.value)}><option>All methods</option>{["Bank transfer", "Wallet debit", "Cash", "Direct debit", "POS/manual"].map((m) => <option key={m}>{m}</option>)}</select></div>
                  </FilterBar>
                  <PagedTable rows={rows} rowKey={(r) => r.id} onRowClick={setView}
                    columns={[{ id: "d", header: "Date", render: (r) => fmtDate(r.date) }, { id: "b", header: "Borrower", render: (r) => <b>{r.borrowerName}</b> }, { id: "l", header: "Loan", render: (r) => r.loanReference }, { id: "a", header: "Amount", render: (r) => money(r.amount) }, { id: "m", header: "Method", render: (r) => r.method }, { id: "r", header: "Reference", render: (r) => r.reference }, { id: "s", header: "Status", render: (r) => <StatusBadge status={r.status} /> }]} />
                </>
              ) : (
                <PagedTable rows={dueItems} rowKey={(d) => `${d.l.id}-${d.s.no}`} onRowClick={(d) => navigate("loan-detail", d.l.id)} emptyText="Nothing due"
                  columns={[{ id: "b", header: "Borrower", render: (d) => <b>{d.l.borrower.name}</b> }, { id: "l", header: "Loan", render: (d) => d.l.reference }, { id: "d", header: "Due date", render: (d) => fmtDate(d.s.dueDate) }, { id: "a", header: "Balance due", render: (d) => money(d.s.amount - d.s.paid) }, { id: "s", header: "Status", render: (d) => <StatusBadge status={d.s.status} /> },
                    { id: "x", header: "", render: (d) => can("loans.repay") && <Button variant="ghost" onClick={() => { navigate("loan-detail", d.l.id) }}>Open loan</Button> }]} />
              )}
            </Panel>
            {rec && <RecordRepaymentModal ctx={ctx} onClose={() => setRec(false)} />}
            {view && (
              <ActionModal title={`Repayment ${view.reference}`} onClose={() => setView(null)} submitLabel="Open loan" onSubmit={() => navigate("loan-detail", view.loanId)}>
                <KV items={[["Borrower", view.borrowerName], ["Loan", view.loanReference], ["Amount", money(view.amount)], ["Method", view.method], ["Date", fmtDate(view.date)], ["Status", <StatusBadge key="s" status={view.status} />], ["Recorded by", view.recordedBy], ["Allocation", view.allocation.map((a) => `Installment #${a.no}: ${money(a.amount)}`).join("; ")]]} />
              </ActionModal>
            )}
          </>
        )
      }}
    </LoanPage>
  )
}
