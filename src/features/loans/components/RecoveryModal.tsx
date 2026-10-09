import { useState } from "react"
import { SelectField } from "@/components/ui"
import { ActionModal, KV, StatusBadge, TextArea, fmtDate, money, type LoanCtx } from "./LoanUi"
import type { RecoveryStatus } from "../types/loan.types"

const actions: { label: string; type: string; status?: RecoveryStatus; guarantor?: boolean; placeholder: string }[] = [
  { label: "Send reminder", type: "Reminder sent", status: "Reminder Sent", placeholder: "SMS / email reminder sent to borrower." },
  { label: "Contact borrower", type: "Borrower contacted", placeholder: "Spoke with borrower — outcome…" },
  { label: "Record follow-up (promise to pay)", type: "Follow-up", status: "Promise to Pay", placeholder: "Borrower promised to pay ₦… by …" },
  { label: "Add recovery note", type: "Note", placeholder: "Internal note" },
  { label: "Contact guarantor", type: "Guarantor contacted", status: "Guarantor Contacted", guarantor: true, placeholder: "Called guarantor — outcome…" },
  { label: "Initiate guarantor recovery", type: "Guarantor recovery initiated", status: "Guarantor Recovery", guarantor: true, placeholder: "Formal demand issued to guarantor." },
  { label: "Mark resolved", type: "Resolved", status: "Resolved", placeholder: "How was the case resolved?" },
]

export function RecoveryModal({ ctx, caseId, onClose }: { ctx: LoanCtx; caseId: string; onClose: () => void }) {
  const c = ctx.data.recoveryCases.find((x) => x.id === caseId)!
  const loan = ctx.data.loans.find((l) => l.id === c.loanId)!
  const gs = ctx.data.guarantorRequests.filter((g) => g.loanId === loan.id)
  const [label, setLabel] = useState(actions[0].label)
  const [text, setText] = useState("")
  const act = actions.find((a) => a.label === label)!
  const noG = act.guarantor && !gs.length
  return (
    <ActionModal wide title={`Recovery – ${loan.borrower.name}`} onClose={onClose} submitLabel="Log action" disabled={!ctx.can("loans.recover") || !!noG || !text.trim()}
      onSubmit={async () => {
        await ctx.service.recoveryAction(c, act.type, text, act.status)
        ctx.notify(`${act.type} logged`)
      }}>
      <KV cols={3} items={[["Loan", loan.reference], ["Outstanding", money(loan.outstanding)], ["Overdue", `${money(loan.overdueAmount)} · ${loan.daysOverdue} days`], ["Contact", loan.borrower.phone], ["Case status", <StatusBadge key="s" status={c.status} />], ["Assigned to", c.assignedTo],
        ["Guarantors", gs.length ? gs.map((g) => `${g.guarantor.name} (${g.guarantor.phone})`).join("; ") : "None"]]} />
      <div className="form-grid" style={{ marginTop: 14 }}>
        <SelectField label="Action" value={label} options={actions.map((a) => a.label)} onChange={setLabel} />
        <div />
        <TextArea label="Details" value={text} onChange={setText} placeholder={act.placeholder} />
      </div>
      {noG && <div style={{ color: "var(--amber-text)" }}>This loan has no guarantors.</div>}
      <div className="form-section-title">Case history</div>
      {c.notes.length ? [...c.notes].reverse().map((n) => <div key={n.id} style={{ marginBottom: 6 }}><b>{n.type}</b> — {n.text} <span style={{ color: "var(--faint)" }}>{n.by} · {fmtDate(n.at)}</span></div>) : <span style={{ color: "var(--muted)" }}>No actions logged yet.</span>}
    </ActionModal>
  )
}
