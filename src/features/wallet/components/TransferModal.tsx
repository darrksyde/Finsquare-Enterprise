import { useMemo, useState } from "react"
import { Field, SelectField } from "@/components/ui"
import { ActionModal, NumField } from "@/features/loans/components/LoanUi"
import { BANKS, HOME_BANK } from "../constants/banks"
import { z } from "zod"
import { amountSchema, firstError } from "../schemas/wallet.schema"
import { money, type WalletCtx } from "./WalletShell"

const transferOutSchema = z.object({
  accountNumber: z.string().regex(/^\d{10}$/, "Account number must be 10 digits"),
  bankName: z.string().min(1, "Choose a bank"),
  amount: amountSchema,
  narration: z.string().trim().min(3, "Add a short narration").max(80),
  pin: z.string().regex(/^\d{4}$/, "Enter your 4-digit PIN"),
})

/** General transfer: pay any bank account from a wallet (the main wallet unless opened from a branch wallet). */
export default function TransferModal({ ctx, fromId, onClose }: { ctx: WalletCtx; fromId?: string; onClose: () => void }) {
  const sources = ctx.walletsWith("wallet.transfer")
  const source = sources.find((w) => w.id === fromId) ?? sources.find((w) => w.type === "Main Organization") ?? sources[0]
  const [accountNumber, setAccountNumber] = useState("")
  const [bankName, setBankName] = useState(HOME_BANK)
  const [amount, setAmount] = useState(NaN)
  const [narration, setNarration] = useState("")
  const [pin, setPin] = useState("")
  const internal = useMemo(() => ctx.data.wallets.find((w) => w.accountNumber === accountNumber && w.bankName === bankName), [ctx.data.wallets, accountNumber, bankName])
  const accountName = internal ? internal.name : accountNumber.length === 10 ? "Account holder (confirmed by bank)" : ""
  const error = firstError(transferOutSchema.safeParse({ accountNumber, bankName, amount, narration, pin }))
  if (!source) return null
  return (
    <ActionModal title="Transfer" submitLabel={ctx.mode === "simulated" ? "Authorize (simulated)" : "Authorize transfer"} onClose={onClose} disabled={!!error || ctx.mode === "blocked"}
      onSubmit={async () => {
        try {
          await ctx.service.transferOut({ fromId: source.id, accountNumber, bankName, accountName: accountName || accountNumber, amount, narration, pin }, ctx.actor, ctx.mode)
          ctx.notify(ctx.mode === "simulated" ? "Transfer simulated — no money moved" : "Transfer sent")
        } catch (e) {
          ctx.notify(e instanceof Error ? e.message : "Transfer failed")
          throw e
        }
      }}>
      <div className="wallet-hero" style={{ marginBottom: 12 }}>
        <span>From {source.name}</span>
        <b>{money(source.availableBalance)}</b>
      </div>
      <div className="form-grid">
        <Field label="Account number" value={accountNumber} placeholder="10 digits" onChange={(v) => setAccountNumber(v.replace(/\D/g, "").slice(0, 10))} />
        <SelectField label="Bank" value={bankName} options={BANKS} onChange={setBankName} />
        {accountName && <p className="wallet-note span-2" style={{ margin: 0 }}>Recipient: <b>{accountName}</b></p>}
        <NumField label="Amount (₦)" value={amount} onChange={setAmount} />
        <Field label="Narration" value={narration} placeholder="What is this for?" onChange={setNarration} />
        <Field label="Transaction PIN" type="password" value={pin} placeholder="4 digits" onChange={(v) => setPin(v.replace(/\D/g, "").slice(0, 4))} />
      </div>
      {ctx.mode === "simulated" && <p className="wallet-note">Demo Mode — use PIN 1234. No real money moves.</p>}
    </ActionModal>
  )
}
