import { useState } from "react"
import { ActionModal, NumField, Panel, TextArea } from "./ContributionUi"
import { fmtDate, money } from "@/features/loans/components/LoanUi"
import { Badge, Button } from "@/components/ui"
import { HandCoins } from "@/icons"
import { commissionPreview, isPersonal, keepsRunningAfterPayout, publicLinkAvailable, requiresApproval } from "../domain/contribution.rules"
import { payoutBreakdown, round2 } from "../domain/calculations"
import { CONTRIBUTION_ORG_ID } from "../constants"
import type { ContributionPageProps, ContributionCtx } from "./ContributionUi"
import type { Contribution, ContributionPaymentMethodId, ContributionWithdrawal, WithdrawalKind } from "../types/contribution.types"

const methodOptions = (contribution: Contribution) =>
  contribution.paymentMethods.filter((method) => method.enabled)

interface ModalProps extends Pick<ContributionPageProps, "notify"> {
  ctx: ContributionCtx
  contribution: Contribution
  onClose: () => void
}

/** Records a contribution payment — manual entry, confirmed transfer or settled collection. */
export function RecordPaymentModal({
  ctx,
  contribution,
  onClose,
  notify,
  preselectedParticipantId,
}: ModalProps & { preselectedParticipantId?: string }) {
  const participants = ctx.participantsFor(contribution.id)
  const [participantId, setParticipantId] = useState(preselectedParticipantId ?? participants[0]?.id ?? "")
  const [amount, setAmount] = useState(contribution.fixedAmount ?? contribution.minimumAmount ?? 0)
  const [method, setMethod] = useState<ContributionPaymentMethodId>(methodOptions(contribution)[0]?.id ?? "cash")
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)

  const periods = ctx.periodsFor(contribution.id).filter((period) => period.participantId === participantId)
  const outstanding = periods.filter(
    (period) => period.state === "Missed" || period.state === "Late" || period.state === "Partially Paid",
  )
  const nextDue = periods.find((period) => period.state === "Expected")?.dueDate

  const submit = async () => {
    if (!participantId) return setError("Choose a contributor.")
    if (!amount || amount <= 0) return setError("Enter an amount greater than zero.")
    try {
      await ctx.service.recordPayment(
        CONTRIBUTION_ORG_ID,
        { contributionId: contribution.id, participantId, amount: round2(amount), method, note: note || undefined },
        ctx.ctx,
      )
      notify(`Payment of ${money(amount)} recorded for ${contribution.name}`)
      ctx.retry()
    } catch {
      setError("The payment could not be recorded.")
    }
  }

  return (
    <ActionModal title="Record contribution" onClose={onClose} onSubmit={submit} submitLabel="Record payment" disabled={!participantId}>
      <div className="form-grid">
        <label className="field span-2">
          <span>Contributor</span>
          <select value={participantId} onChange={(event) => setParticipantId(event.target.value)}>
            <option value="">Select contributor…</option>
            {participants.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.memberName}
                {participant.isExternal ? " (external)" : ""}
              </option>
            ))}
          </select>
        </label>
        <NumField label="Amount" value={amount} onChange={setAmount} />
        <label className="field">
          <span>Payment method</span>
          <select value={method} onChange={(event) => setMethod(event.target.value as ContributionPaymentMethodId)}>
            {methodOptions(contribution).map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>
      {outstanding.length > 0 && (
        <p className="contribution-hint">
          {outstanding.length} outstanding period{outstanding.length === 1 ? "" : "s"} — the oldest is settled first.
          {nextDue ? ` Next due ${fmtDate(nextDue)}.` : ""}
        </p>
      )}
      <TextArea label="Note (optional)" value={note} onChange={setNote} placeholder="e.g. cash received at the Ikeja branch" />
      {ctx.mode !== "live" && <p className="contribution-hint">Demo mode: this payment is recorded but no real money moves.</p>}
      {error && <p className="field-error">{error}</p>}
    </ActionModal>
  )
}

/** Requests a payout and shows the gross → commission → net breakdown before submitting. */
export function WithdrawModal({
  ctx,
  contribution,
  onClose,
  notify,
  participantId: fixedParticipantId,
}: ModalProps & { participantId?: string }) {
  const participants = ctx.participantsFor(contribution.id)
  const personal = isPersonal(contribution)
  const [participantId, setParticipantId] = useState(fixedParticipantId ?? (personal ? participants[0]?.id ?? "" : ""))
  const [kind, setKind] = useState<WithdrawalKind>("Partial")
  const [amount, setAmount] = useState(0)
  const [fees, setFees] = useState(0)
  const [scheduledFor, setScheduledFor] = useState(contribution.payout.scheduledDate ?? "")
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)

  const balance = ctx.balanceFor(contribution)
  const participant = participants.find((p) => p.id === participantId)
  const available = participant ? participant.availableBalance : balance.availableBalance
  const gross = kind === "Full" ? available : Math.min(amount, available)
  const preview = commissionPreview(contribution, gross, fees)
  const breakdown = payoutBreakdown(gross, preview.amount, fees)
  const needsApproval = requiresApproval(contribution, gross)

  const submit = async () => {
    if (gross <= 0) return setError("There is no balance available to pay out.")
    if (kind === "Scheduled" && !scheduledFor) return setError("Choose the date this payout should run.")
    const withdrawal = await ctx.service.requestWithdrawal(
      CONTRIBUTION_ORG_ID,
      { contributionId: contribution.id, participantId: participant?.id, kind, amount: gross, fees, scheduledFor: scheduledFor || undefined, note: note || undefined },
      ctx.ctx,
    )
    if (!withdrawal) return setError("This payout could not be created.")
    notify(
      withdrawal.status === "Completed"
        ? `${money(withdrawal.netPayout)} paid out`
        : withdrawal.status === "Scheduled"
          ? `Payout scheduled for ${fmtDate(withdrawal.scheduledFor)}`
          : "Payout requested — waiting for a second approver",
    )
    ctx.retry()
  }

  return (
    <ActionModal title="Payout / withdrawal" onClose={onClose} onSubmit={submit} submitLabel={kind === "Scheduled" ? "Schedule payout" : needsApproval ? "Request payout" : "Pay out"}>
      <div className="form-grid">
        {personal && !fixedParticipantId && (
          <label className="field span-2">
            <span>Pay out to</span>
            <select value={participantId} onChange={(event) => setParticipantId(event.target.value)}>
              {participants.map((p) => (
                <option key={p.id} value={p.id}>{p.memberName} — {money(p.availableBalance)} available</option>
              ))}
            </select>
          </label>
        )}
        {!personal && (
          <p className="contribution-hint span-2">
            This is a General contribution, so the whole pooled balance of {money(balance.availableBalance)} is paid out together.
          </p>
        )}
        <label className="field">
          <span>Payout type</span>
          <select value={kind} onChange={(event) => setKind(event.target.value as WithdrawalKind)}>
            <option value="Partial">Partial withdrawal</option>
            <option value="Full">Full payout</option>
            <option value="Scheduled">Scheduled disbursement</option>
          </select>
        </label>
        {kind !== "Full" && <NumField label="Amount" value={amount} onChange={setAmount} />}
        <NumField label="Applicable fees" value={fees} onChange={setFees} />
        {kind === "Scheduled" && (
          <label className="field">
            <span>Payout date</span>
            <input type="date" value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} />
          </label>
        )}
      </div>

      <Panel title="Payout breakdown" subtitle="Available balance − commission − fees = net payout">
        <div className="detail-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
          <div><span>Gross balance</span><b>{money(breakdown.gross)}</b></div>
          <div><span>Commission</span><b>{preview.applies ? money(breakdown.commission) : "Not applicable"}</b></div>
          <div><span>Fees</span><b>{money(breakdown.fees)}</b></div>
          <div><span>Net payout</span><b>{money(breakdown.net)}</b></div>
        </div>
      </Panel>

      {!preview.applies && contribution.commission.model !== "none" && (
        <p className="contribution-hint">Commission only applies to Personal contributions, so a General pool pays out in full.</p>
      )}
      <p className="contribution-hint">
        {needsApproval
          ? `Above the ${money(contribution.payout.approvalThreshold)} threshold, so a second administrator must approve this payout.`
          : "Within the approval threshold, so this payout is released immediately."}{" "}
        {keepsRunningAfterPayout(contribution)
          ? "The contribution stays active and contributors carry on."
          : "A full payout will complete this contribution."}
      </p>
      <TextArea label="Note (optional)" value={note} onChange={setNote} placeholder="e.g. end-of-month payout" />
      {error && <p className="field-error">{error}</p>}
    </ActionModal>
  )
}

/** Read-only list of the payment methods this contribution accepts. */
export function PaymentMethodsRow({ contribution }: { contribution: Contribution }) {
  return (
    <div className="contribution-methods">
      {contribution.paymentMethods.map((method) => (
        <div key={method.id} className="contribution-method">
          <HandCoins size={14} />
          <div>
            <b>{method.label}</b>
            <small>{method.description}</small>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * The plan's link, as one copyable row.
 *
 * An `Open` plan has one link anyone may use, so it can be disabled. A member plan advertises
 * no pool link — its members pay through their own link, from the Contributors tab — but the
 * address is still shown so an administrator can copy it.
 */
export function ContributionLinkRow({
  ctx,
  contribution,
  notify,
}: {
  ctx: ContributionCtx
  contribution: Contribution
  notify: (message: string) => void
}) {
  const link = contribution.publicLink
  const [copied, setCopied] = useState(false)

  if (!link) return null
  const url = `${window.location.origin}/contribute/${link.slug}`
  const openToEveryone = contribution.participantScope === "Open"
  const available = publicLinkAvailable(contribution)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      notify("Contribution link copied")
    } catch {
      notify("Copy the link manually — the clipboard is unavailable.")
    }
  }

  const toggle = async (enabled: boolean) => {
    await ctx.service.setPublicLink(CONTRIBUTION_ORG_ID, contribution.id, enabled, ctx.ctx)
    notify(enabled ? "Open link enabled" : "Open link disabled")
    ctx.retry()
  }

  return (
    <div className="contribution-link">
      <code>{url}</code>
      <div className="header-actions">
        <Button variant="secondary" onClick={copy}>{copied ? "Copied" : "Copy link"}</Button>
        {openToEveryone && ctx.can("contributions.manage_access") && (
          <Button variant={link.enabled ? "ghost" : "secondary"} onClick={() => toggle(!link.enabled)}>
            {link.enabled ? "Disable link" : "Enable link"}
          </Button>
        )}
      </div>
      <div className="contribution-link-status">
        {openToEveryone ? (
          available ? (
            <Badge tone="green">Open — anyone with the link</Badge>
          ) : (
            <Badge tone={link.enabled ? "amber" : "neutral"}>
              {link.enabled ? `Offline — contribution is ${contribution.status}` : "Link disabled"}
            </Badge>
          )
        ) : (
          <Badge tone="neutral">Members only — each member has their own link</Badge>
        )}
      </div>
    </div>
  )
}

/**
 * Confirms a payout decision. Releasing money always shows the arithmetic first,
 * and a rejection must carry the approver's reason — it becomes part of the
 * payout's record.
 */
export function WithdrawalDecisionModal({
  ctx,
  contribution,
  withdrawal,
  approve,
  onClose,
}: {
  ctx: ContributionCtx
  contribution: Contribution
  withdrawal: ContributionWithdrawal
  approve: boolean
  onClose: () => void
}) {
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    try {
      if (approve) {
        await ctx.service.approveWithdrawal(CONTRIBUTION_ORG_ID, withdrawal.id, ctx.ctx)
        ctx.notify(`${money(withdrawal.netPayout)} paid out`)
      } else {
        await ctx.service.rejectWithdrawal(CONTRIBUTION_ORG_ID, withdrawal.id, ctx.ctx, note.trim())
        ctx.notify("Payout rejected")
      }
      ctx.retry()
    } catch {
      setError("The payout could not be updated.")
      throw new Error("payout decision failed")
    }
  }

  return (
    <ActionModal
      danger={!approve}
      title={`${approve ? "Approve" : "Reject"} ${withdrawal.reference}`}
      submitLabel={approve ? "Approve payout" : "Reject payout"}
      disabled={!approve && note.trim().length < 3}
      onClose={onClose}
      onSubmit={submit}
    >
      <p style={{ marginTop: 0 }}>
        {approve ? (
          <>Releasing <b>{money(withdrawal.netPayout)}</b> to {withdrawal.destination}.</>
        ) : (
          <>This request for <b>{money(withdrawal.netPayout)}</b> stays on record as rejected.</>
        )}
      </p>
      <div className="detail-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", padding: "14px 0" }}>
        <div><span>Gross</span><b>{money(withdrawal.grossAmount)}</b></div>
        <div><span>Commission</span><b>{money(withdrawal.commission)}</b></div>
        <div><span>Fees</span><b>{money(withdrawal.fees)}</b></div>
        <div><span>Net payout</span><b>{money(withdrawal.netPayout)}</b></div>
      </div>
      <p className="contribution-hint">{contribution.name} · requested by {withdrawal.requestedBy}</p>
      <TextArea
        label={approve ? "Note (optional)" : "Reason for rejection (required)"}
        value={note}
        onChange={setNote}
        placeholder={approve ? "e.g. approved at the monthly payout meeting" : "e.g. contributor disputed the amount"}
      />
      {error && <p className="field-error">{error}</p>}
    </ActionModal>
  )
}
