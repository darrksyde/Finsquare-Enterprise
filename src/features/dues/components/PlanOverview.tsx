import { Disclosure } from "@/components/ui"
import { Button, KV, Panel, DuesFrequencyBadge, DuesStatusBadge } from "./DuesUi"
import { Pencil } from "@/icons"
import { fmtDate, money } from "@/features/loans/components/LoanUi"
import { lienRulesLabel } from "../domain/dues.rules"
import { scopeLabel } from "../domain/dues.rules"
import type { DuesCtx } from "./DuesUi"
import type { DuesPlan, DuesPlanTotals } from "../types/dues.types"
/** One amount in charge, then the figures that explain it. */
function MoneyBlock({ totals }: { totals: DuesPlanTotals }) {
  return (
    <div className="money-block">
      <div className="money-main">
        <span>Outstanding now</span>
        <b>{money(totals.outstanding)}</b>
        <small>
          {money(totals.collected)} collected · {money(totals.overdue)} overdue
        </small>
      </div>
      <div className="money-facts">
        <div>
          <span>Members</span>
          <b>{totals.participants}</b>
        </div>
        <div>
          <span>Paid up</span>
          <b>{totals.paidParticipants}</b>
        </div>
        <div>
          <span>Still owing</span>
          <b>{totals.unpaidParticipants}</b>
        </div>
        <div>
          <span>Awaiting wallet</span>
          <b>{totals.awaitingRecovery}</b>
        </div>
      </div>
    </div>
  )
}
/**
 * What this plan is and where its money stands.
 *
 * Outstanding means payable now; the rolling schedule of charges that are not due yet is named
 * separately so a large "expected" figure can never be mistaken for money owed today.
 */
export function PlanOverview({
  ctx,
  plan,
  totals,
  onViewParticipants,
  onEditRules,
}: {
  ctx: DuesCtx
  plan: DuesPlan
  totals: DuesPlanTotals
  onViewParticipants: () => void
  onEditRules: () => void
}) {
  const participants = ctx.participantsFor(plan.id)
  return (
    <>
      <Panel
        title="Money"
        subtitle={`${money(totals.collected)} collected of ${money(totals.expected)} scheduled`}
        actions={
          totals.participants > 0 ? (
            <button type="button" className="disclosure-summary" onClick={onViewParticipants}>
              View participants
            </button>
          ) : undefined
        }
      >
        <MoneyBlock totals={totals} />
        <Disclosure label="Show the dues ledger maths">
          <KV
            items={[
              ["Expected in total", money(totals.expected)],
              ["Collected", money(totals.collected)],
              ["Outstanding now", money(totals.outstanding)],
              ["Overdue", money(totals.overdue)],
              ["Not due yet", money(totals.scheduled)],
              ["Amount per period", money(plan.amount)],
            ]}
            cols={3}
          />
        </Disclosure>
      </Panel>

      <Panel title="Dues plan">
        <KV
          items={[
            ["Amount", `${money(plan.amount)} per ${plan.frequency === "One-time" ? "payment" : "period"}`],
            ["Frequency", <DuesFrequencyBadge key="frequency" plan={plan} />],
            ["Who pays", scopeLabel(plan, participants)],
            ["Status", <DuesStatusBadge key="status" status={plan.status} />],
            ["Starts", fmtDate(plan.startDate)],
            ["Ends", plan.endDate ? fmtDate(plan.endDate) : "Runs until paused or closed"],
          ]}
          cols={3}
        />
        {plan.description && <p className="contribution-hint">{plan.description}</p>}

        <Disclosure label="Plan details">
          <KV
            items={[
              ["Group", plan.groupName ?? "Not from a group"],
              ["Branch", plan.branchName ?? "Not from a branch"],
              ["Created by", plan.createdBy],
              ["Charges generated", `${ctx.chargesFor(plan.id).length}`],
            ]}
            cols={2}
          />
        </Disclosure>
      </Panel>

      <Panel
        title="Wallet lien"
        subtitle="How unpaid dues are collected"
        actions={
          ctx.can("dues.manage_rules") ? (
            <Button variant="secondary" icon={Pencil} onClick={onEditRules}>
              Edit rules
            </Button>
          ) : undefined
        }
      >
        <p className="contribution-hint">{lienRulesLabel(plan.lien)}</p>
        <KV
          items={[
            ["Lien", plan.lien.enabled ? "Applied to unpaid dues" : "Not applied — tracked only"],
            ["Grace period", `${plan.lien.graceDays} day${plan.lien.graceDays === 1 ? "" : "s"}`],
            ["Recovery", plan.lien.autoRecover ? "Automatic when the wallet has funds" : "Manual, on request"],
          ]}
          cols={3}
        />
        <p className="contribution-hint">
          A lien is a claim on the member&apos;s own wallet, never a second ledger — money is only ever deducted when it
          is actually there, and never more than the amount owed.
        </p>
      </Panel>
    </>
  )
}
