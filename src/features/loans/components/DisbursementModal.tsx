import { useState } from "react"
import { SelectField } from "@/components/ui"
import { useWorkspace } from "@/app/providers/WorkspaceProvider"
import { DisbursementSource, defaultDisbursementWallet, evaluateDisbursement } from "@/features/wallet/components/DisbursementSource"
import { allOk } from "@/features/wallet/domain/wallet.rules"
import { useWallet } from "@/features/wallet/hooks/useWallet"
import { calculateLoan } from "../domain/calculations"
import { ActionModal, PagedTable, money, type LoanCtx } from "./LoanUi"
import type { DisbursementMethod, LoanApplication } from "../types/loan.types"

export function DisbursementModal({ apps, ctx, onClose, onDone }: { apps: LoanApplication[]; ctx: LoanCtx; onClose: () => void; onDone?: (loanIds: string[]) => void }) {
  const [method, setMethod] = useState<DisbursementMethod>("Bank transfer")
  const wallet = useWallet()
  const walletOn = useWorkspace().enabledModules.has("wallet")
  const sourceId = defaultDisbursementWallet(wallet)
  const rows = apps.map((a) => {
    const s = calculateLoan({ ...a.terms, amount: a.approvedAmount ?? a.terms.amount })
    return { a, s, dest: method === "Bank transfer" ? "Access Bank •••• 4471" : method === "Wallet credit" ? "Member wallet" : "Branch cash desk" }
  })
  const net = rows.reduce((t, r) => t + r.s.netDisbursed, 0)
  const approved = apps.every((a) => ["Approved", "Offer Accepted"].includes(a.status))
  const gate = walletOn && wallet.data ? evaluateDisbursement(wallet, sourceId, net, approved) : null
  return (
    <ActionModal wide title={apps.length > 1 ? `Bulk disbursement (${apps.length} loans)` : "Disburse loan"} onClose={onClose} submitLabel={gate?.approvals ? `Submit for approval (${gate.approvals})` : `Disburse ${money(net)}`}
      disabled={gate ? !allOk(gate.checks) : false}
      onSubmit={async () => {
        if (walletOn) {
          const items = rows.map((r) => ({ applicationId: r.a.id, borrowerName: r.a.applicant.name, productName: r.a.productName, amount: r.s.netDisbursed }))
          try {
            const res = await wallet.service.disburse({ walletId: sourceId, items, reason: `Disburse ${items.length} approved loan(s)` }, wallet.actor, wallet.mode)
            if (res.status === "pending") {
              ctx.notify("Disbursement sent for approval — the wallet is debited once it is approved")
              return
            }
          } catch (e) {
            ctx.notify(e instanceof Error ? e.message : "Disbursement failed")
            throw e
          }
        }
        const loans = await ctx.service.disburse(apps.map((a) => a.id), method)
        ctx.notify(`${loans.length} loan(s) disbursed — repayment schedules are now active`)
        onDone?.(loans.map((l) => l.id))
      }}>
      {walletOn && wallet.data && <DisbursementSource w={wallet} walletId={sourceId} total={net} loansApproved={approved} />}
      <div className="form-grid" style={{ marginBottom: 14 }}>
        <SelectField label="Disbursement method" value={method} options={["Bank transfer", "Wallet credit", "Cash pickup"]} onChange={(m) => setMethod(m as DisbursementMethod)} />
      </div>
      <div className="table-panel">
        <PagedTable rows={rows} rowKey={(r) => r.a.id} pageSize={6}
          columns={[
            { id: "b", header: "Borrower", render: (r) => <b>{r.a.applicant.name}</b> },
            { id: "m", header: "Approved", render: (r) => money(r.s.principal) },
            { id: "f", header: "Fees", render: (r) => money(r.s.fees) },
            { id: "d", header: "Deductions", render: (r) => money(r.s.deduction) },
            { id: "n", header: "Net amount", render: (r) => <b>{money(r.s.netDisbursed)}</b> },
            { id: "t", header: "Destination", render: (r) => r.dest },
          ]} />
      </div>
      <div style={{ marginTop: 12, color: "var(--muted)", fontSize: 12 }}>Approved → Disbursed → Active → Repayment schedule active. Wallet balances are validated again by the backend before funds move.</div>
    </ActionModal>
  )
}
