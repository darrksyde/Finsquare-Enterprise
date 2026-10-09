import { useState } from "react"
import { Button, Field, SectionHeader } from "@/components/ui"
import { ActionModal, KV, NumField, PagedTable, Panel, fmtDate } from "@/features/loans/components/LoanUi"
import { firstError, fundSchema } from "../schemas/wallet.schema"
import { TxStatusBadge, WalletSelect, money, type WalletCtx } from "./WalletShell"

export default function FundWallet({ ctx, walletId, onClose }: { ctx: WalletCtx; walletId?: string; onClose: () => void }) {
  const options = ctx.walletsWith("wallet.fund").filter((w) => w.status === "active" || w.status === "restricted")
  const [id, setId] = useState(walletId && options.some((w) => w.id === walletId) ? walletId : (options[0]?.id ?? ""))
  const [amount, setAmount] = useState(NaN)
  const methods = ctx.data.fundingMethods
  const [method, setMethod] = useState(methods.find((m) => m.enabled)?.id ?? "")
  const [reference, setReference] = useState("")
  const [sender, setSender] = useState("")
  const wallet = options.find((w) => w.id === id)
  const err = firstError(fundSchema.safeParse({ walletId: id, amount, method, reference }))
  const blocked = ctx.mode === "blocked"
  return (
    <ActionModal title="Fund wallet" submitLabel={ctx.mode === "simulated" ? "Simulate funding" : "I've made the transfer"} onClose={onClose} disabled={!!err || blocked}
      onSubmit={async () => {
        await ctx.service.fund({ walletId: id, amount, method, reference, senderName: sender }, ctx.actor, ctx.mode)
        ctx.notify(ctx.mode === "simulated" ? "Funding simulated — no real money moved" : "Funding recorded — the wallet is credited once the bank confirms")
      }}>
      <div className="form-grid">
        <WalletSelect label="Wallet to fund" value={id} onChange={setId} wallets={options} />
        <NumField label="Amount (₦)" value={amount} onChange={setAmount} />
        <label className="field"><span>Funding method</span>
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            {methods.map((m) => <option key={m.id} value={m.id} disabled={!m.enabled}>{m.label}{m.enabled ? "" : " (unavailable)"}</option>)}
          </select>
        </label>
        <Field label="Reference (optional)" value={reference} onChange={setReference} />
        <Field label="Sender name (optional)" value={sender} onChange={setSender} />
      </div>
      {wallet && method === "bank_transfer" && (
        <div style={{ marginTop: 14 }}>
          <b style={{ fontSize: 13 }}>Pay into this account</b>
          <KV items={[["Bank", wallet.bankName], ["Account number", wallet.accountNumber], ["Account name", `${ctx.data.account.accountName}`], ["Wallet", wallet.name]]} />
          <p style={{ color: "var(--muted)", fontSize: 12 }}>Anyone can transfer to this account number and the payment will appear against this wallet. Include your reference in the narration.</p>
        </div>
      )}
      {ctx.mode === "simulated" && <p className="wallet-note">Demo Mode: the credit is simulated and clearly flagged on the transaction.</p>}
      {blocked && <p style={{ color: "var(--red-text)", fontSize: 12 }}>Money movement is disabled in this environment.</p>}
    </ActionModal>
  )
}
