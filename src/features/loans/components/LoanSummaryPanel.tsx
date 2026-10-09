import { Panel, StatusBadge, fmtDate, money, PagedTable, KV } from "./LoanUi"
import type { LoanSummary, RepaymentScheduleItem } from "../types/loan.types"

export function ScheduleTable({ schedule, pageSize = 12 }: { schedule: RepaymentScheduleItem[]; pageSize?: number }) {
  return (
    <PagedTable rows={schedule} rowKey={(s) => String(s.no)} pageSize={pageSize}
      columns={[
        { id: "n", header: "#", render: (s) => s.no },
        { id: "d", header: "Due date", render: (s) => fmtDate(s.dueDate) },
        { id: "a", header: "Amount", className: "num", render: (s) => money(s.amount) },
        { id: "p", header: "Principal", render: (s) => money(s.principal) },
        { id: "i", header: "Interest", render: (s) => money(s.interest) },
        { id: "pd", header: "Paid", render: (s) => money(s.paid) },
        { id: "b", header: "Balance", render: (s) => money(s.balance) },
        { id: "s", header: "Status", render: (s) => <StatusBadge status={s.status} /> },
      ]} />
  )
}

export function LoanSummaryPanel({ summary, showSchedule = true }: { summary: LoanSummary; showSchedule?: boolean }) {
  return (
    <>
      <Panel title="Loan summary" subtitle="Calculated automatically from the terms">
        <KV cols={3} items={[
          ["Principal", money(summary.principal)],
          ["Interest", money(summary.interest)],
          ["Fees", money(summary.fees)],
          ["Deduction at disbursement", money(summary.deduction)],
          ["Amount to disburse", <span style={{ color: "var(--green-text)" }}>{money(summary.netDisbursed)}</span>],
          ["Periodic repayment", money(summary.installment)],
          ["Total repayment", money(summary.totalRepayable)],
          ["Number of repayments", summary.count],
          ["Start date", fmtDate(summary.startDate)],
          ["Expected end date", fmtDate(summary.endDate)],
        ]} />
      </Panel>
      {showSchedule && (
        <div style={{ marginTop: 12 }}>
          <Panel title="Repayment schedule preview"><ScheduleTable schedule={summary.schedule} pageSize={6} /></Panel>
        </div>
      )}
    </>
  )
}
