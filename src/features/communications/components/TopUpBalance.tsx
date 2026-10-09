import { useState } from "react"
import { ActionModal, KV, NumField } from "./CommunicationUi"
import { money } from "@/features/loans/components/LoanUi"
import { smsRemaining } from "../domain/messaging"
import { firstError, topUpSchema } from "../schemas/message.schema"
import type { CommunicationsCtx } from "../hooks/useCommunications"

/**
 * Funds the SMS balance from the organization's own wallet.
 *
 * There is no second payment system here: the modal picks an existing wallet, and the service
 * debits it with the ordinary wallet movement rules — limits, permissions and the environment
 * gate all still apply. The modal shows what the balance becomes so the administrator is choosing
 * a number of texts, not just a figure.
 */
export function TopUpBalance({
  ctx,
  onClose,
  notify,
}: {
  ctx: CommunicationsCtx
  onClose: () => void
  notify: (message: string) => void
}) {
  const spendable = ctx.fundingWallets.filter((wallet) => ctx.canSpendFrom(wallet.id))
  const [walletId, setWalletId] = useState(spendable[0]?.id ?? "")
  const [amount, setAmount] = useState(5_000)
  const wallet = spendable.find((candidate) => candidate.id === walletId)
  const costPerSms = ctx.account?.costPerSms ?? 0

  const error =
    firstError(topUpSchema.safeParse({ walletId, amount })) ??
    (ctx.mode === "blocked" ? "Money movement is disabled in this environment." : null) ??
    (wallet && amount > wallet.availableBalance ? `The wallet holds ${money(wallet.availableBalance)}.` : null)

  const submit = async () => {
    if (error) throw new Error(error)
    const result = await ctx.topUpBalance({ amount, walletId })
    notify(
      ctx.mode === "simulated"
        ? `Demo mode: ${money(amount)} top-up simulated — the SMS balance is ${money(result.balance)}`
        : `SMS balance topped up to ${money(result.balance)}`,
    )
  }

  return (
    <ActionModal
      title="Top up SMS balance"
      onClose={onClose}
      onSubmit={submit}
      submitLabel={ctx.mode === "simulated" ? "Simulate top-up" : `Top up ${money(amount)}`}
      disabled={Boolean(error)}
    >
      {spendable.length === 0 ? (
        <p className="contribution-hint">
          No wallet in this organization can fund the balance. Funding needs a wallet you can withdraw from.
        </p>
      ) : (
        <div className="form-grid">
          <label className="field span-2">
            <span>Pay from</span>
            <select value={walletId} onChange={(event) => setWalletId(event.target.value)}>
              {spendable.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name} — {money(option.availableBalance)}
                </option>
              ))}
            </select>
          </label>
          <NumField label="Amount (₦)" value={amount} onChange={setAmount} />
        </div>
      )}

      {ctx.account && (
        <KV
          cols={2}
          items={[
            ["SMS balance now", `${money(ctx.account.balance)} (~${ctx.smsLeft.toLocaleString("en-NG")} SMS)`],
            [
              "After top-up",
              `${money(ctx.account.balance + (Number.isFinite(amount) ? amount : 0))} (~${smsRemaining(
                ctx.account.balance + (Number.isFinite(amount) ? amount : 0),
                costPerSms,
              ).toLocaleString("en-NG")} SMS)`,
            ],
          ]}
        />
      )}

      {error && <p className="contribution-hint contribution-debit">{error}</p>}
      {ctx.mode !== "live" && !error && (
        <p className="contribution-hint">
          Demo mode: the wallet is debited and the balance rises, but no real money moves.
        </p>
      )}
    </ActionModal>
  )
}
