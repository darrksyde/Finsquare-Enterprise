import { useState } from "react"
import { Button, Disclosure, Progress, Tabs } from "@/components/ui"
import { ShellPage } from "@/components/layout/ShellPage"
import { RecordRepaymentModal } from "../components/RecordRepaymentModal"
import { GuarantorVerifyModal } from "../components/GuarantorVerifyModal"
import { RecoveryModal } from "../components/RecoveryModal"
import { ScheduleTable } from "../components/LoanSummaryPanel"
import { ActionModal, KV, LoanPage, PagedTable, Panel, StatusBadge, fmtDate, money, type LoanCtx, type LoanPageProps } from "../components/LoanUi"
import type { GuarantorRequest, Loan } from "../types/loan.types"

type Tab = "schedule" | "payments" | "guarantors" | "documents"

function Detail({ loan, ctx }: { loan: Loan; ctx: LoanCtx }) {
  const { data, can, service, notify } = ctx
  const [tab, setTab] = useState<Tab>("schedule")
  const [pay, setPay] = useState(false)
  const [verify, setVerify] = useState<GuarantorRequest | null>(null)
  const [confirm, setConfirm] = useState<"default" | "writeoff" | null>(null)
  const [recovery, setRecovery] = useState(false)
  const payments = data.repayments.filter((r) => r.loanId === loan.id)
  const gs = data.guarantorRequests.filter((g) => g.loanId === loan.id)
  const rc = data.recoveryCases.filter((c) => c.loanId === loan.id)
  const va = loan.virtualAccount
  const t = loan.terms
  const pct = Math.round((loan.paid / loan.totalRepayable) * 100)
  const inRecovery = ["Overdue", "Defaulted"].includes(loan.status)

  /** Recovery only appears when a loan is actually in trouble. */
  const recoveryActions = (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: 14 }}>
      {can("loans.recover") && (rc[0] ? (
        <Button variant="secondary" onClick={() => setRecovery(true)}>Recovery notes</Button>
      ) : (
        inRecovery && <Button onClick={async () => { await service.startRecovery(loan.id); notify("Recovery case opened") }}>Start recovery</Button>
      ))}
      {can("loans.recover") && inRecovery && loan.status !== "Defaulted" && (
        <Button variant="secondary" onClick={() => setConfirm("default")}>Mark as defaulted</Button>
      )}
      {can("loans.recover") && loan.status === "Defaulted" && (
        <Button variant="danger" onClick={() => setConfirm("writeoff")}>Write off</Button>
      )}
    </div>
  )

  return (
    <>
      <ShellPage
        level="detail"
        title={loan.borrower.name}
        description={`${loan.productName} · disbursed ${fmtDate(loan.disbursedAt)} · ends ${fmtDate(loan.endDate)}`}
        meta={
          <>
            <StatusBadge status={loan.status} />
            <span className="contribution-sub">{loan.reference}</span>
            {inRecovery && <span className="contribution-sub">{loan.daysOverdue} days overdue</span>}
          </>
        }
        actions={
          can("loans.repay") && loan.outstanding > 0 && loan.status !== "Written Off" ? (
            <Button onClick={() => setPay(true)}>Record repayment</Button>
          ) : undefined
        }
      >
        <Panel title="Repayment progress" subtitle={`${pct}% of ${money(loan.totalRepayable)} repaid`} flush={false}>
          <Progress value={pct} />
          <div className="loan-progress-facts">
            <div><span>Paid</span><b>{money(loan.paid)}</b></div>
            <div>
              <span>Outstanding</span>
              <b>{money(loan.outstanding)}</b>
            </div>
            <div>
              <span>Overdue</span>
              <b className={loan.overdueAmount ? "contribution-debit" : undefined}>{money(loan.overdueAmount)}</b>
            </div>
            <div>
              <span>Next due</span>
              <b>{loan.nextDueDate ? `${money(loan.nextDueAmount)} on ${fmtDate(loan.nextDueDate)}` : "—"}</b>
            </div>
          </div>
        </Panel>

        <Disclosure label="Loan terms">
          <KV
            cols={3}
            items={[
              ["Principal", money(loan.principal)],
              ["Interest", money(loan.interest)],
              ["Fees", money(loan.fees)],
              ["Deduction", money(loan.deduction)],
              ["Net disbursed", money(loan.netDisbursed)],
              ["Total repayable", money(loan.totalRepayable)],
              ["Installment", money(loan.installment)],
              ["Frequency", t.frequency],
              ["Rate", t.interestType === "Zero interest" ? "Zero interest" : `${t.interestRate}% ${t.interestType.toLowerCase()}`],
              ["Officer", loan.officer],
            ]}
          />
        </Disclosure>

        <Disclosure label="Borrower and repayment account">
          <KV
            cols={3}
            items={[
              ["Contact", `${loan.borrower.phone}${loan.borrower.email ? ` · ${loan.borrower.email}` : ""}`],
              ["Borrower ID", loan.borrower.memberId ?? "External borrower"],
              ["Branch", loan.borrower.branch],
              ["Account number", va.accountNumber],
              ["Bank", va.bank],
              ["Account name", va.accountName],
              ["Reference", va.reference],
              ["Account status", <StatusBadge key="va" status={va.status === "Active" ? "Active" : "Completed"} />],
              ["Last payment", payments[0] ? fmtDate(payments[0].date) : "None yet"],
            ]}
          />
        </Disclosure>

        {inRecovery || rc.length > 0 ? <Panel title="Recovery">{recoveryActions}</Panel> : null}

        <Tabs
          tabs={[
            { id: "schedule" as Tab, label: "Repayment schedule" },
            { id: "payments" as Tab, label: "Payments", count: payments.length },
            { id: "guarantors" as Tab, label: "Guarantors", count: gs.length },
            { id: "documents" as Tab, label: "Documents", count: loan.documents.length },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === "schedule" && <Panel><ScheduleTable schedule={loan.schedule} /></Panel>}
        {tab === "payments" && (
          <Panel>
            <PagedTable
              rows={payments}
              rowKey={(r) => r.id}
              emptyText="No payments yet"
              columns={[
                { id: "d", header: "Date", render: (r) => fmtDate(r.date) },
                { id: "a", header: "Amount", render: (r) => money(r.amount) },
                { id: "m", header: "Method", render: (r) => r.method },
                { id: "r", header: "Reference", render: (r) => r.reference },
                { id: "al", header: "Allocated to", render: (r) => r.allocation.map((a) => `#${a.no}`).join(", ") },
                { id: "s", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
              ]}
            />
          </Panel>
        )}
        {tab === "guarantors" && (
          <Panel>
            <PagedTable
              rows={gs}
              rowKey={(g) => g.id}
              onRowClick={setVerify}
              emptyText="This loan has no guarantors"
              columns={[
                { id: "n", header: "Name", render: (g) => <b>{g.guarantor.name}</b> },
                { id: "c", header: "Contact", render: (g) => g.guarantor.phone },
                { id: "r", header: "Relationship", render: (g) => g.guarantor.relationship },
                { id: "a", header: "Guarantee", render: (g) => money(g.amount) },
                { id: "s", header: "Status", render: (g) => <StatusBadge status={g.status} /> },
              ]}
            />
          </Panel>
        )}
        {tab === "documents" && (
          <Panel>
            <PagedTable
              rows={loan.documents}
              rowKey={(d) => d.id}
              columns={[
                { id: "n", header: "Document", render: (d) => d.name },
                { id: "t", header: "Type", render: (d) => d.type },
                { id: "u", header: "Uploaded", render: (d) => fmtDate(d.uploadedAt) },
                { id: "s", header: "Review", render: (d) => <StatusBadge status={d.review} /> },
              ]}
            />
          </Panel>
        )}

        <Disclosure label={`Activity log (${loan.activity.length})`}>
          <div className="stack-tight">
            {[...loan.activity].reverse().map((e) => (
              <div key={e.id} className="log-row">
                <div>
                  <b>{e.action}</b>
                  {e.detail && <span>{e.detail}</span>}
                </div>
                <time>{e.actor} · {fmtDate(e.at)}</time>
              </div>
            ))}
          </div>
        </Disclosure>
      </ShellPage>

      {pay && <RecordRepaymentModal ctx={ctx} loanId={loan.id} onClose={() => setPay(false)} />}
      {verify && <GuarantorVerifyModal req={verify} ctx={ctx} onClose={() => setVerify(null)} />}
      {recovery && rc[0] && <RecoveryModal ctx={ctx} caseId={rc[0].id} onClose={() => setRecovery(false)} />}
      {confirm && (
        <ActionModal
          danger={confirm === "writeoff"}
          title={confirm === "default" ? "Mark loan as defaulted" : "Write off loan"}
          submitLabel="Confirm"
          onClose={() => setConfirm(null)}
          onSubmit={async () => {
            await (confirm === "default" ? service.markDefaulted(loan.id) : service.writeOff(loan.id))
            notify(confirm === "default" ? "Loan marked as defaulted" : "Loan written off")
          }}
        >
          {confirm === "default"
            ? "The loan will be flagged as defaulted and remain in recovery."
            : `The outstanding balance of ${money(loan.outstanding)} will be written off. This is recorded in the loan history.`}
        </ActionModal>
      )}
    </>
  )
}

export function LoanDetailPage(props: LoanPageProps) {
  return (
    <LoanPage bare {...props}>
      {(ctx) => {
        const loan = ctx.data.loans.find((l) => l.id === props.id)
        if (!loan) {
          return (
            <ShellPage level="detail" title="Loan not found" description="This loan no longer exists, or belongs to another organization.">
              <Panel title="Nothing to show">
                <p className="contribution-hint" style={{ padding: 14 }}>Open the loans list to pick another loan.</p>
              </Panel>
            </ShellPage>
          )
        }
        return <Detail loan={loan} ctx={ctx} />
      }}
    </LoanPage>
  )
}
