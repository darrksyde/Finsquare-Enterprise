import { Plus } from "@/icons"
import { Button } from "@/components/ui"
import { ShellPage } from "@/components/layout/ShellPage"
import type { AttentionItem } from "@/components/feedback/AttentionStrip"
import { daysBetween, todayISO } from "../domain/calculations"
import { LoanPage, Panel, PagedTable, StatusBadge, compactMoney, fmtDate, money, type LoanPageProps } from "../components/LoanUi"

/**
 * The loans front door: what needs an administrator, then the two lists that carry
 * work. Disbursement and repayment history live on their own pages.
 */
export function LoansOverviewPage(props: LoanPageProps) {
  return (
    <LoanPage bare {...props}>
      {({ data, can, navigate }) => {
        const live = data.loans.filter((l) => !["Completed", "Written Off"].includes(l.status))
        const pending = data.applications
          .filter((a) => ["Submitted", "Under Review", "Guarantor Pending"].includes(a.status))
          .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
        const sum = (f: (l: (typeof data.loans)[number]) => number, list = data.loans) => list.reduce((s, l) => s + f(l), 0)
        const today = todayISO()
        const overdue = data.loans
          .filter((l) => ["Overdue", "Defaulted"].includes(l.status))
          .sort((a, b) => b.daysOverdue - a.daysOverdue)
        const dueSoon = data.loans.filter((l) => l.nextDueDate && daysBetween(today, l.nextDueDate) <= 14 && l.daysOverdue === 0)

        const attention: AttentionItem[] = []
        if (pending.length > 0) {
          attention.push({
            id: "loan-applications",
            label: `${pending.length} ${pending.length === 1 ? "application" : "applications"} to review`,
            detail: "Oldest first",
            tone: "blue",
            onSelect: () => navigate("loan-applications"),
          })
        }
        if (overdue.length > 0) {
          attention.push({
            id: "loan-overdue",
            label: `${overdue.length} ${overdue.length === 1 ? "loan" : "loans"} overdue`,
            detail: compactMoney(sum((l) => l.overdueAmount, overdue)),
            tone: "red",
            onSelect: () => navigate("loan-recovery"),
          })
        }
        if (dueSoon.length > 0) {
          attention.push({
            id: "loan-due-soon",
            label: `${dueSoon.length} repayments due in 14 days`,
            detail: compactMoney(dueSoon.reduce((s, l) => s + l.nextDueAmount, 0)),
            tone: "amber",
            onSelect: () => navigate("loan-repayments"),
          })
        }

        return (
          <ShellPage
            level="index"
            title="Loans"
            description={`${live.length} active · ${compactMoney(sum((l) => l.outstanding))} outstanding`}
            attention={attention}
            actions={can("loan_products.create") ? <Button icon={Plus} onClick={() => navigate("loan-type-create")}>Create loan type</Button> : undefined}
          >
            <div className="loan-quick-links">
              {([["loan-guarantors", "Guarantors", "guarantors.view"], ["loan-recovery", "Recovery", "loans.recover"], ["loan-products", "Loan types", "loan_products.view"]] as const)
                .filter(([, , permission]) => can(permission))
                .map(([view, label]) => (
                  <Button key={view} variant="ghost" onClick={() => navigate(view)}>
                    {label}
                  </Button>
                ))}
            </div>

            <Panel
              title="Applications requiring action"
              subtitle="Oldest first"
              actions={<Button variant="ghost" onClick={() => navigate("loan-applications")}>View all</Button>}
            >
              <PagedTable
                pageSize={6}
                rows={pending}
                rowKey={(a) => a.id}
                onRowClick={(a) => navigate("loan-application-detail", a.id)}
                emptyText="No applications waiting"
                columns={[
                  { id: "a", header: "Applicant", render: (a) => <b>{a.applicant.name}</b> },
                  { id: "p", header: "Product", render: (a) => <span className="contribution-sub">{a.productName}</span> },
                  { id: "m", header: "Amount", render: (a) => money(a.terms.amount) },
                  { id: "d", header: "Submitted", render: (a) => fmtDate(a.submittedAt) },
                  { id: "s", header: "Status", render: (a) => <StatusBadge status={a.status} /> },
                ]}
              />
            </Panel>

            <Panel
              title="Overdue repayments"
              subtitle="Highest days overdue first"
              actions={<Button variant="ghost" onClick={() => navigate("loan-recovery")}>Recovery</Button>}
            >
              <PagedTable
                pageSize={6}
                rows={overdue}
                rowKey={(l) => l.id}
                onRowClick={(l) => navigate("loan-detail", l.id)}
                emptyText="Nothing overdue — every repayment is on time."
                columns={[
                  { id: "b", header: "Borrower", render: (l) => <b>{l.borrower.name}</b> },
                  { id: "o", header: "Overdue", render: (l) => <span className="contribution-debit">{money(l.overdueAmount)}</span> },
                  { id: "d", header: "Days", render: (l) => `${l.daysOverdue}d` },
                  { id: "s", header: "Status", render: (l) => <StatusBadge status={l.status} /> },
                ]}
              />
            </Panel>
          </ShellPage>
        )
      }}
    </LoanPage>
  )
}
