import { Disclosure } from "@/components/ui"
import { KV, Panel, ContributionStatusBadge } from "./ContributionUi"
import { ContributionLinkRow, PaymentMethodsRow } from "./ContributionModals"
import type { ContributionCtx } from "./ContributionUi"
import { fmtDate, money } from "@/features/loans/components/LoanUi"
import {
  commissionApplies,
  commissionModelLabel,
  frequencyLabel,
  isPersonal,
  keepsRunningAfterPayout,
  nextPayoutDate,
  recipientLabel,
} from "../domain/contribution.rules"
import type { Contribution, ContributionBalance } from "../types/contribution.types"

const SCOPE_LABELS: Record<Contribution["participantScope"], string> = {
  All: "All members",
  Selected: "Selected members",
  Open: "Open to everyone",
}

/** A single amount in charge, then the figures that explain it. */
export function MoneyBlock({
  balance,
  facts,
}: {
  balance: ContributionBalance
  facts: { label: string; value: string }[]
}) {
  return (
    <div className="money-block">
      <div className="money-main">
        <span>Available balance</span>
        <b>{money(balance.availableBalance)}</b>
        <small>
          {money(balance.totalContributed)} collected · {money(balance.totalWithdrawn)} paid out
        </small>
      </div>
      <div className="money-facts">
        {facts.map((fact) => (
          <div key={fact.label}>
            <span>{fact.label}</span>
            <b>{fact.value}</b>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Answers the two questions a plan's money raises: how much is available, and what is this
 * contribution? A General pool is one balance; a Personal plan's member balances live in the
 * Contributors tab, so nothing here repeats them.
 */
export function PlanOverview({
  ctx,
  contribution,
  balance,
  contributorCount,
  onViewContributors,
}: {
  ctx: ContributionCtx
  contribution: Contribution
  balance: ContributionBalance
  contributorCount: number
  onViewContributors: () => void
}) {
  const payoutDate = nextPayoutDate(contribution, ctx.today)
  const facts: { label: string; value: string }[] = [
    { label: isPersonal(contribution) ? "Members" : "Contributors", value: `${contributorCount}` },
    { label: "Withdrawn", value: money(balance.totalWithdrawn) },
    { label: "Pending", value: money(balance.pendingAmount) },
    { label: "Next payout", value: payoutDate ? fmtDate(payoutDate) : "On request" },
  ]
  if (balance.targetAmount) facts.splice(2, 0, { label: "Target", value: money(balance.targetAmount) })

  return (
    <>
      <Panel
        title="Money"
        subtitle={isPersonal(contribution) ? "One balance pool, kept per member" : "One pooled balance"}
        actions={
          contributorCount > 0 ? (
            <button type="button" className="disclosure-summary" onClick={onViewContributors}>
              View {isPersonal(contribution) ? "members" : "contributors"}
            </button>
          ) : undefined
        }
      >
        <MoneyBlock balance={balance} facts={facts} />
        <Disclosure label="Show payout maths">
          <KV
            items={[
              ["Gross balance", money(balance.availableBalance)],
              [
                "Commission",
                !commissionApplies(contribution)
                  ? contribution.commission.model === "none"
                    ? "No commission"
                    : "Not applicable to this plan"
                  : `${commissionModelLabel(contribution.commission.model)} · ${
                      contribution.commission.model === "percentage"
                        ? `${contribution.commission.percentage}%`
                        : money(contribution.commission.fixedAmount ?? 0)
                    }`,
              ],
              ["Commission accrued", money(balance.commissionAccrued)],
              ["Approval threshold", money(contribution.payout.approvalThreshold)],
              ["Net payout", money(balance.netPayout)],
            ]}
            cols={2}
          />
        </Disclosure>
      </Panel>

      <Panel title="Contribution">
        <KV
          items={[
            ["Type", contribution.type],
            ["Works as", isPersonal(contribution) ? "Personal — a balance per member" : "General — one pooled balance"],
            ["Frequency", frequencyLabel(contribution)],
            ["Who can participate", SCOPE_LABELS[contribution.participantScope]],
            ["Money goes to", recipientLabel(contribution.recipient)],
            ["Status", <ContributionStatusBadge key="status" status={contribution.status} />],
            ["Started", fmtDate(contribution.startDate)],
          ]}
          cols={3}
        />

        <ContributionLinkRow ctx={ctx} contribution={contribution} notify={ctx.notify} />

        <Disclosure label="Plan details">
          <KV
            items={[
              [
                "Amount",
                contribution.type === "Flexible"
                  ? contribution.minimumAmount
                    ? `From ${money(contribution.minimumAmount)}`
                    : "Contributors choose"
                  : money(contribution.fixedAmount ?? contribution.targetAmount ?? 0),
              ],
              ["Target", contribution.targetAmount ? money(contribution.targetAmount) : "No target"],
              ["Ends", contribution.endDate ? fmtDate(contribution.endDate) : "Runs until closed"],
              ["After a payout", keepsRunningAfterPayout(contribution) ? "Keeps running" : "Completes the plan"],
              ["Group", contribution.groupName ?? "Not from a group"],
              ["Created by", contribution.createdBy],
              ["Payout", contribution.payout.mode === "manual" ? "Manual, on request" : "Automatic on a date"],
              ["Partial payouts", "Always allowed"],
            ]}
            cols={2}
          />
          <div style={{ paddingTop: 12 }}>
            <PaymentMethodsRow contribution={contribution} />
          </div>
        </Disclosure>
      </Panel>
    </>
  )
}
