import { useMemo, useState } from "react"
import { Button, Disclosure } from "@/components/ui"
import { PagedTable, Panel, ParticipantStateBadge, PeriodStateBadge } from "./ContributionUi"
import { fmtDate, money } from "@/features/loans/components/LoanUi"
import { isPersonal, memberLinkPath } from "../domain/contribution.rules"
import type { ContributionCtx } from "./ContributionUi"
import type { Contribution, ContributionParticipant, ContributionPeriod } from "../types/contribution.types"

/**
 * Who is contributing.
 *
 * A Personal plan holds a balance per member, so each line carries that member's balance and
 * opens into their own ledger with a payout of their own. A General plan holds one pool, so its
 * lines only say who has paid in — showing a balance per person there would imply separate money.
 */
export function PlanContributors({
  ctx,
  contribution,
  onWithdraw,
  onRecordPayment,
}: {
  ctx: ContributionCtx
  contribution: Contribution
  onWithdraw: (participantId: string) => void
  onRecordPayment: (participantId: string) => void
}) {
  const personal = isPersonal(contribution)
  const participants = ctx.participantsFor(contribution.id)
  const periods = ctx.periodsFor(contribution.id)
  const withdrawals = ctx.withdrawalsFor(contribution.id)
  const missed = participants.reduce((sum, p) => sum + p.missedCount, 0)
  const totalHeld = participants.reduce((sum, p) => sum + p.availableBalance, 0)

  return (
    <Panel
      title={personal ? "Members" : "Contributors"}
      subtitle={
        participants.length === 0
          ? "Nobody is associated with this plan yet."
          : personal
            ? `${participants.length} ${participants.length === 1 ? "member" : "members"} holding ${money(totalHeld)}${missed > 0 ? ` · ${missed} missed contributions` : ""}`
            : `${participants.length} ${participants.length === 1 ? "person" : "people"}${missed > 0 ? ` · ${missed} missed contributions` : ""}`
      }
    >
      {participants.length === 0 ? (
        <div className="tab-empty" style={{ border: 0, height: 180 }}>
          <b>No {personal ? "members" : "contributors"} yet</b>
          <span>
            {contribution.participantScope === "Open"
              ? "Share the link to start collecting."
              : "Nobody matched this plan's participants when it was created."}
          </span>
        </div>
      ) : (
        <ul className="person-list">
          {participants.map((participant) => (
            <li key={participant.id}>
              <Disclosure
                plain
                label={
                  <span className="person-line">
                    <span className="person-name">
                      {participant.memberName}
                      {participant.isExternal && <small className="contribution-sub"> · from the link</small>}
                    </span>
                    <span className="person-metric person-hide">{money(participant.totalContributed)} contributed</span>
                    {personal && <span className="person-metric">{money(participant.availableBalance)} balance</span>}
                    <span className={`person-metric ${participant.missedCount > 0 ? "contribution-debit" : "person-hide"}`}>
                      {participant.missedCount > 0 ? `${participant.missedCount} missed` : "Up to date"}
                    </span>
                    <ParticipantStateBadge state={participant.state} />
                  </span>
                }
              >
                <MemberDetail
                  ctx={ctx}
                  contribution={contribution}
                  participant={participant}
                  periods={periods.filter((period) => period.participantId === participant.id)}
                  withdrawals={withdrawals.filter((withdrawal) => withdrawal.participantId === participant.id)}
                  onWithdraw={() => onWithdraw(participant.id)}
                  onRecordPayment={() => onRecordPayment(participant.id)}
                />
              </Disclosure>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

/** One member's own money: what they have paid, what is left, and their period ledger. */
function MemberDetail({
  ctx,
  contribution,
  participant,
  periods,
  withdrawals,
  onWithdraw,
  onRecordPayment,
}: {
  ctx: ContributionCtx
  contribution: Contribution
  participant: ContributionParticipant
  periods: ContributionPeriod[]
  withdrawals: { id: string; reference: string; grossAmount: number; netPayout: number; status: string; completedAt?: string; requestedAt: string }[]
  onWithdraw: () => void
  onRecordPayment: () => void
}) {
  const [showAll, setShowAll] = useState(false)
  const ordered = useMemo(() => [...periods].sort((a, b) => b.dueDate.localeCompare(a.dueDate)), [periods])
  const shown = showAll ? ordered : ordered.slice(0, 6)
  const withdrawn = withdrawals.reduce((sum, withdrawal) => sum + withdrawal.grossAmount, 0)
  const outstanding = ordered
    .filter((period) => period.state !== "Paid")
    .reduce((sum, period) => sum + Math.max(0, period.expectedAmount - period.paidAmount), 0)
  const link = participant.memberId ? memberLinkPath(contribution, participant.memberId) : undefined

  const copyLink = async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${link}`)
      ctx.notify(`${participant.memberName}'s link copied`)
    } catch {
      ctx.notify("Copy the link manually — the clipboard is unavailable.")
    }
  }

  return (
    <div className="stack-tight">
      <div className="detail-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div>
          <span>Total contributed</span>
          <b>{money(participant.totalContributed)}</b>
        </div>
        <div>
          <span>Balance</span>
          <b>{money(participant.availableBalance)}</b>
        </div>
        <div>
          <span>Withdrawn</span>
          <b>{money(withdrawn)}</b>
        </div>
        {contribution.frequencyBased && (
          <>
            <div>
              <span>Expected each period</span>
              <b>{money(participant.expectedAmount)}</b>
            </div>
            <div>
              <span>Outstanding</span>
              <b className={outstanding > 0 ? "contribution-debit" : undefined}>{money(outstanding)}</b>
            </div>
            <div>
              <span>Missed / late</span>
              <b>
                {participant.missedCount} / {participant.lateCount}
              </b>
            </div>
          </>
        )}
        {contribution.targetAmount && (
          <div>
            <span>Remaining to target</span>
            <b>{money(Math.max(0, contribution.targetAmount - participant.totalContributed))}</b>
          </div>
        )}
      </div>

      <div className="contribution-filters">
        {ctx.can("contributions.record_payment") && (
          <Button variant="secondary" onClick={onRecordPayment}>
            Record payment
          </Button>
        )}
        {ctx.can("contributions.withdraw") && participant.availableBalance > 0 && (
          <Button onClick={onWithdraw}>Withdraw for {participant.memberName.split(" ")[0]}</Button>
        )}
        {link && <Button variant="ghost" onClick={copyLink}>Copy their link</Button>}
      </div>

      {withdrawals.length > 0 && (
        <PagedTable
          rows={withdrawals}
          rowKey={(row) => row.id}
          pageSize={withdrawals.length}
          emptyText="No payouts yet."
          columns={[
            { id: "ref", header: "Payout", render: (row) => <span className="mono">{row.reference}</span> },
            { id: "gross", header: "Gross", render: (row) => money(row.grossAmount) },
            { id: "net", header: "Net paid", render: (row) => <b>{money(row.netPayout)}</b> },
            { id: "status", header: "Status", render: (row) => row.status },
            { id: "date", header: "Date", render: (row) => fmtDate(row.completedAt ?? row.requestedAt) },
          ]}
        />
      )}

      {ordered.length === 0 ? (
        <p className="contribution-hint">This plan has no schedule, so there are no expected periods to track.</p>
      ) : (
        <>
          <PagedTable
            rows={shown}
            rowKey={(row) => row.id}
            pageSize={shown.length}
            emptyText="No periods."
            columns={[
              { id: "due", header: "Due", render: (row) => fmtDate(row.dueDate) },
              { id: "expected", header: "Expected", render: (row) => money(row.expectedAmount) },
              { id: "paid", header: "Paid", render: (row) => money(row.paidAmount) },
              { id: "state", header: "State", render: (row) => <PeriodStateBadge state={row.state} /> },
            ]}
          />
          {!showAll && ordered.length > shown.length && (
            <button type="button" className="disclosure-summary" aria-expanded={false} onClick={() => setShowAll(true)}>
              Show all {ordered.length} periods
            </button>
          )}
        </>
      )}
    </div>
  )
}
