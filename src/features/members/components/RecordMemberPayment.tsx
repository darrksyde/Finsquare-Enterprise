import { useMemo, useState } from "react"
import { Badge } from "@/components/ui"
import { ActionModal, KV, TextArea, fmtDate, money } from "@/features/loans/components/LoanUi"
import type { MemberObligation } from "../domain/member-obligations"
import type { MemberPaymentMethod, MemberPaymentResult } from "../services/member-payments.service"

const METHODS: { id: MemberPaymentMethod; label: string; hint: string }[] = [
  { id: "wallet", label: "Member wallet", hint: "Debits the member's own balance" },
  { id: "cash", label: "Cash", hint: "Received at the branch" },
  { id: "bank_transfer", label: "Bank transfer", hint: "Confirmed in the bank account" },
]

const round2 = (value: number) => Math.round(value * 100) / 100

/** Paying everything outstanding is a real collection workflow, so it is one option in the same list. */
const SETTLE_ALL = "*"

/**
 * Takes money from a member against one thing they owe.
 *
 * The member can have dozens of outstanding periods, so listing them all with an input each buried
 * the two real decisions — what is being paid, and how — under a wall of identical rows. One
 * selector chooses the target and shows its detail, then a single amount is confirmed. Everything
 * outstanding stays reachable as the last option rather than as thirty rows.
 */
export function RecordMemberPayment({
  memberName,
  obligations,
  walletBalance,
  hasWallet,
  mode,
  pay,
  onClose,
  notify,
}: {
  memberName: string
  obligations: MemberObligation[]
  walletBalance: number
  hasWallet: boolean
  mode: "live" | "simulated" | "blocked"
  pay: (payment: {
    memberName: string
    items: { obligation: MemberObligation; amount: number }[]
    method: MemberPaymentMethod
    note?: string
  }) => Promise<MemberPaymentResult>
  onClose: () => void
  notify: (message: string) => void
}) {
  const totalDue = useMemo(() => round2(obligations.reduce((sum, item) => sum + item.outstanding, 0)), [obligations])
  const [targetId, setTargetId] = useState(() => obligations[0]?.id ?? SETTLE_ALL)
  const [amount, setAmount] = useState(() => round2(obligations[0]?.outstanding ?? 0))
  const [method, setMethod] = useState<MemberPaymentMethod>(
    hasWallet && walletBalance > 0 ? "wallet" : "cash",
  )
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)

  const settlingAll = targetId === SETTLE_ALL
  const selected = obligations.find((item) => item.id === targetId)
  const unsettled = obligations.filter((item) => item.outstanding > 0)
  const total = settlingAll ? totalDue : round2(amount)
  const overWallet = method === "wallet" && total > walletBalance
  const blocked = mode === "blocked"

  const choose = (id: string) => {
    setTargetId(id)
    setAmount(id === SETTLE_ALL ? totalDue : round2(obligations.find((item) => item.id === id)?.outstanding ?? 0))
    setError(null)
  }

  // `ActionModal` closes once `onSubmit` resolves, so a validation failure has to reject —
  // otherwise the error flashes and the modal disappears, taking the entered amount with it.
  const fail = (message: string): never => {
    setError(message)
    throw new Error(message)
  }

  const submit = async () => {
    if (total <= 0) fail("Enter an amount greater than zero.")
    if (overWallet) fail(`That is more than the ${money(walletBalance)} in the member's wallet.`)
    const items = settlingAll
      ? unsettled.map((item) => ({ obligation: item, amount: item.outstanding }))
      : selected
        ? [{ obligation: selected, amount: round2(amount) }]
        : []
    try {
      const result = await pay({ memberName, items, method, note: note || undefined })
      notify(
        `${money(result.total)} recorded for ${memberName} across ${result.recorded} ${
          result.recorded === 1 ? "item" : "items"
        }`,
      )
    } catch (reason) {
      fail(reason instanceof Error ? reason.message : "The payment could not be recorded.")
    }
  }

  const targetTitle = settlingAll ? "Everything outstanding" : selected?.title ?? ""
  const targetDetail = settlingAll
    ? `${unsettled.length} ${unsettled.length === 1 ? "item" : "items"} — each settled in full`
    : selected
      ? `${selected.detail} · due ${fmtDate(selected.dueDate)}${selected.paid > 0 ? ` · ${money(selected.paid)} already paid` : ""}`
      : ""

  return (
    <ActionModal
      title={`Record payment — ${memberName}`}
      onClose={onClose}
      onSubmit={submit}
      submitLabel={total > 0 ? `Record ${money(total)}` : "Record payment"}
      disabled={total <= 0 || blocked}
      wide
    >
      <KV
        cols={2}
        items={[
          ["Outstanding", money(totalDue)],
          ["Member wallet", hasWallet ? money(walletBalance) : "No wallet yet"],
        ]}
      />

      {obligations.length === 0 ? (
        <p className="contribution-hint">This member has nothing due. Contributions and loan instalments appear here as they fall due.</p>
      ) : (
        <>
          <label className="field">
            <span>Which payment is this for?</span>
            <select value={targetId} onChange={(event) => choose(event.target.value)}>
              {obligations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} — {money(item.outstanding)} · due {fmtDate(item.dueDate)}
                  {item.overdue ? " · overdue" : ""}
                </option>
              ))}
              <option value={SETTLE_ALL}>Everything outstanding — {money(totalDue)}</option>
            </select>
          </label>

          <div className="payment-target">
            <span className="payment-target-what">
              <b>{targetTitle}</b>
              <small>{targetDetail}</small>
            </span>
            {selected?.overdue && <Badge tone="red">Overdue</Badge>}
          </div>

          <label className={settlingAll ? "field" : "field field-lead"}>
            <span>{settlingAll ? "Total being paid" : "Amount being paid"}</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={settlingAll ? totalDue : amount}
              disabled={settlingAll}
              onChange={(event) => setAmount(Number(event.target.value) || 0)}
            />
          </label>

          <div className="create-question">
            <span className="create-q">How was it paid?</span>
            <div className="create-methods">
              {METHODS.map((option) => (
                <label key={option.id}>
                  <input
                    type="radio"
                    name="member-payment-method"
                    checked={method === option.id}
                    disabled={option.id === "wallet" && (!hasWallet || walletBalance <= 0)}
                    onChange={() => setMethod(option.id)}
                  />
                  {option.label}
                  <small>{option.hint}</small>
                </label>
              ))}
            </div>
          </div>

          <TextArea
            label="Note (optional)"
            value={note}
            onChange={setNote}
            placeholder="e.g. cash received at the Ikeja branch"
          />
        </>
      )}

      {mode !== "live" && (
        <p className="contribution-hint">
          Demo mode: the payment is recorded and every balance moves, but no real money leaves the wallet.
        </p>
      )}
      {error && <p className="contribution-hint" style={{ color: "var(--red-text)" }}>{error}</p>}
    </ActionModal>
  )
}
