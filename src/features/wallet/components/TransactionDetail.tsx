import { useState } from "react"
import { Button } from "@/components/ui"
import { ActionModal, KV, TextArea } from "@/features/loans/components/LoanUi"
import type { WalletTransaction } from "../types/wallet.types"
import { Drawer, TxStatusBadge, fmtDateTime, money, type WalletCtx } from "./WalletShell"

export default function TransactionDetail({ tx, ctx, onClose }: { tx: WalletTransaction; ctx: WalletCtx; onClose: () => void }) {
  const [reversing, setReversing] = useState(false)
  const [reason, setReason] = useState("")
  const wallet = ctx.data.wallets.find((w) => w.id === tx.walletId)
  const counterpart = tx.related.counterpartWalletId ? ctx.data.wallets.find((w) => w.id === tx.related.counterpartWalletId) : undefined
  const audit = ctx.data.audit.filter((a) => a.transactionId === tx.id || (a.reference && (a.reference === tx.reference || tx.metadata.reference === a.reference)))
  const r = tx.related
  const canReverse = wallet && ctx.canOn(wallet, "wallet.reverse") && tx.status === "Completed" && ctx.mode !== "blocked"
  return (
    <Drawer title={tx.reference} subtitle={tx.description} onClose={onClose} wide>
      <div className="wallet-hero">
        <span>{tx.type}</span>
        <b style={{ color: tx.direction === "credit" ? "var(--green-text)" : "var(--ink)" }}>{tx.direction === "credit" ? "+" : "−"}{money(tx.amount)}</b>
        <TxStatusBadge status={tx.status} />
      </div>
      <div style={{ height: 10 }} />
      <KV items={[
        ["Date & time", fmtDateTime(tx.date)], ["Wallet", tx.walletName], ["Sender", tx.sender], ["Recipient", tx.recipient],
        ["Initiated by", tx.initiatedBy], ["Approved by", tx.approvedBy ?? "—"], ["Fees", money(tx.fee)], ["Direction", tx.direction === "credit" ? "Money in" : "Money out"],
      ]} />
      <h4 className="wallet-h">Related records</h4>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {r.applicationId && <Button variant="secondary" onClick={() => ctx.navigate("loan-application-detail", r.applicationId)}>Loan application</Button>}
        {r.loanReference && <span className="wallet-chip">Loan {r.loanReference}</span>}
        {r.memberName && <span className="wallet-chip">Member: {r.memberName}</span>}
        {r.productName && <span className="wallet-chip">Product: {r.productName}</span>}
        {r.branchName && <span className="wallet-chip">Branch: {r.branchName}</span>}
        {counterpart && <Button variant="secondary" onClick={() => ctx.navigate("wallets", counterpart.id)}>{counterpart.name}</Button>}
        {r.accountNumber && <span className="wallet-chip">Account {r.accountNumber}</span>}
        {!Object.values(r).some(Boolean) && <span style={{ color: "var(--muted)", fontSize: 13 }}>No linked records.</span>}
      </div>
      <h4 className="wallet-h">Metadata</h4>
      <KV items={Object.entries(tx.metadata).map(([k, v]) => [k, v] as [string, string])} />
      <h4 className="wallet-h">Audit history</h4>
      {audit.length ? audit.map((a) => <div key={a.id} className="wallet-row"><div><b>{a.action}</b><small>{a.actor} · {fmtDateTime(a.at)}{a.previousState ? ` · ${a.previousState} → ${a.newState ?? ""}` : a.newState ? ` · ${a.newState}` : ""}</small></div></div>) : <span style={{ color: "var(--muted)", fontSize: 13 }}>Created by {tx.initiatedBy} on {fmtDateTime(tx.date)}.</span>}
      {canReverse && <div style={{ marginTop: 16 }}><Button variant="danger" onClick={() => setReversing(true)}>Reverse transaction</Button></div>}
      {reversing && (
        <ActionModal title={`Reverse ${tx.reference}`} danger submitLabel="Reverse" disabled={reason.trim().length < 3} onClose={() => setReversing(false)}
          onSubmit={async () => {
            try {
              await ctx.service.reverse(tx.id, reason, ctx.actor, ctx.mode)
              ctx.notify("Reversal entry created — the original is marked Reversed")
            } catch (e) {
              ctx.notify(e instanceof Error ? e.message : "Reversal failed")
              throw e
            }
          }}>
          <p style={{ marginTop: 0 }}>A correcting entry is created. The original transaction is kept for the audit trail.</p>
          <TextArea label="Reason" value={reason} onChange={setReason} />
        </ActionModal>
      )}
    </Drawer>
  )
}
