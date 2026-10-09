import { useState } from "react"
import { Badge, Button, Field, SectionHeader } from "@/components/ui"
import { HandCoins, Landmark } from "@/icons"
import { RecipientChip, Zone } from "./PublicContributionParts"
import { publicContributionSchema } from "../schemas/contribution.schema"
import { usePublicContribution } from "../hooks/useContributions"
import { publicLinkAvailable, frequencyLabel } from "../domain/contribution.rules"
import { money } from "@/features/loans/components/LoanUi"
import type { ContributionPaymentMethodId, PublicContributionReceipt } from "../types/contribution.types"

/**
 * Public contribution page. Anyone with the link can contribute — no FinSquare account, no
 * membership. A member's own link also names them and can pay from their wallet balance.
 * Rendered outside the app shell, like the public loan application page.
 */
export default function PublicContributionPage({ slug, memberId }: { slug: string; memberId?: string }) {
  const { contribution, participant, memberWallet, status, service } = usePublicContribution(slug, memberId)
  const [receipt, setReceipt] = useState<PublicContributionReceipt | null>(null)
  const [form, setForm] = useState({ contributorName: "", phone: "", email: "", amount: 0, method: "bank_transfer" as ContributionPaymentMethodId })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (status === "loading") return <Zone><p>Loading…</p></Zone>

  // A member link works while the member is on the plan; the pool link needs the plan to be open.
  const memberLink = Boolean(participant)
  const openLink = contribution ? publicLinkAvailable(contribution) : false

  if (status === "error" || !contribution || (!memberLink && !openLink)) {
    return (
      <Zone>
        <SectionHeader eyebrow="CONTRIBUTION" title="Link unavailable" />
        <p className="contribution-hint">This contribution link is inactive or does not exist. Ask the organization for a current link.</p>
      </Zone>
    )
  }

  if (receipt) {
    return (
      <Zone>
        <div className="onb-done"><HandCoins size={26} /></div>
        <SectionHeader eyebrow="THANK YOU" title={`Contribution recorded`} />
        <p className="contribution-hint">
          Your reference is <b>{receipt.reference}</b>. {money(receipt.amount)} towards {receipt.contributionName}.
        </p>
        <p className="contribution-hint">
          Funds are held in <b>{receipt.recipientLabel}</b>. The organization confirms the payment once it settles.
        </p>
      </Zone>
    )
  }

  const submit = async () => {
    // A member link already knows who is paying, so their name comes from the plan, not the form.
    const payload = { ...form, contributorName: participant?.memberName ?? form.contributorName, slug, memberId }
    const parsed = publicContributionSchema.safeParse(payload)
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Check the details above.")
    if (form.method === "wallet" && memberWallet && form.amount > memberWallet.availableBalance) {
      return setError(`Your wallet holds ${money(memberWallet.availableBalance)}.`)
    }
    setError(null)
    setBusy(true)
    try {
      const result = await service.submitPublicContribution(payload)
      if (!result) {
        setError("This contribution is no longer accepting payments.")
        return
      }
      setReceipt(result)
    } catch {
      setError("Your contribution could not be submitted. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  // A member link pays from a wallet balance, so the wallet method is offered there and only there.
  const methods = contribution.paymentMethods.filter((method) =>
    method.id === "wallet" ? memberLink && Boolean(memberWallet) : true,
  )

  return (
    <Zone>
      <SectionHeader
        eyebrow="CONTRIBUTION"
        title={contribution.name}
        description={contribution.description}
      />

      <div className="public-contribution-head">
        <Badge tone="blue">{contribution.type}</Badge>
        <Badge tone="neutral">{frequencyLabel(contribution)}</Badge>
        {contribution.targetAmount && <Badge tone="amber">Target {money(contribution.targetAmount)}</Badge>}
      </div>

      {participant && (
        <p className="contribution-hint">
          Contributing as <b>{participant.memberName}</b>
          {participant.availableBalance > 0 ? ` · ${money(participant.availableBalance)} already saved` : ""}.
        </p>
      )}

      <RecipientChip recipient={contribution.recipient} />

      <section className="panel" style={{ padding: 16, marginTop: 12 }}>
        <div className="form-grid">
          {participant ? (
            <Field label="Your name" value={participant.memberName} onChange={() => undefined} />
          ) : (
            <Field label="Your name" value={form.contributorName} onChange={(value) => setForm({ ...form, contributorName: value })} />
          )}
          <Field label="Phone (optional)" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
          <Field label="Email (optional)" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
          <label className="field">
            <span>Amount</span>
            <input type="number" min={0} value={form.amount || ""} onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })} />
          </label>
          <label className="field span-2">
            <span>Payment method</span>
            <select value={form.method} onChange={(event) => setForm({ ...form, method: event.target.value as ContributionPaymentMethodId })}>
              {methods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.label}
                  {method.id === "wallet" && memberWallet ? ` — ${money(memberWallet.availableBalance)} available` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
        {contribution.minimumAmount ? <p className="contribution-hint">Minimum contribution {money(contribution.minimumAmount)}.</p> : null}
        {error && <p className="field-error">{error}</p>}
        <div className="contribution-public-actions">
          <Button onClick={submit} disabled={busy}>{busy ? "Submitting…" : "Contribute"}</Button>
        </div>
        <p className="contribution-hint">
          <Landmark size={13} />{" "}
          {form.method === "wallet"
            ? "Paid from your wallet balance, so it is recorded immediately."
            : "No FinSquare account is needed. The organization verifies the payment before it is credited."}
        </p>
      </section>
    </Zone>
  )
}
