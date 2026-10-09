import { useState } from "react"
import { ArrowLeft, Plus } from "@/icons"
import { ActionMenu, Button, Tabs } from "@/components/ui"
import { ShellPage } from "@/components/layout/ShellPage"
import type { AttentionItem } from "@/components/feedback/AttentionStrip"
import {
  ContributionPage,
  ContributionStatusBadge,
  ContributionTypeBadge,
  FrequencyBadge,
  ModeBanner,
  Panel,
  RecipientNote,
} from "../components/ContributionUi"
import { RecordPaymentModal, WithdrawalDecisionModal, WithdrawModal } from "../components/ContributionModals"
import { PlanOverview } from "../components/PlanOverview"
import { PlanContributors } from "../components/PlanContributors"
import { PlanActivity } from "../components/PlanActivity"
import { PlanReports } from "../components/PlanReports"
import { money } from "@/features/loans/components/LoanUi"
import type { ContributionCtx, ContributionPageProps } from "../components/ContributionUi"
import type { Contribution, ContributionStatus, ContributionWithdrawal } from "../types/contribution.types"

type DetailTab = "overview" | "contributors" | "activity" | "reports"

/** One plan, start to finish: what it is, who pays in, what moved, and its rules. */
export default function ContributionDetailPage(props: ContributionPageProps) {
  return <ContributionPage {...props}>{(ctx) => <DetailBody ctx={ctx} />}</ContributionPage>
}

function DetailBody({ ctx }: { ctx: ContributionCtx }) {
  const contribution = ctx.contributions.find((plan) => plan.id === ctx.id)
  const [tab, setTab] = useState<DetailTab>("overview")
  const [modal, setModal] = useState<{ kind: "payment" | "withdraw"; participantId?: string } | null>(null)
  const [decision, setDecision] = useState<{ withdrawal: ContributionWithdrawal; approve: boolean } | null>(null)

  if (!contribution) {
    return (
      <ShellPage
        level="detail"
        title="Contribution not found"
        description="This plan no longer exists, or belongs to another organization."
        actions={
          <Button variant="secondary" icon={ArrowLeft} onClick={() => ctx.navigate("contributions")}>
            All contributions
          </Button>
        }
      >
        <Panel title="Nothing to show">
          <p className="contribution-hint" style={{ padding: 14 }}>
            Open the contributions list to pick another plan.
          </p>
        </Panel>
      </ShellPage>
    )
  }

  const balance = ctx.balanceFor(contribution)
  const participants = ctx.participantsFor(contribution.id)
  const withdrawals = ctx.withdrawalsFor(contribution.id)
  const pending = withdrawals.filter((w) => w.status === "Pending approval")
  const missed = participants.reduce((sum, p) => sum + p.missedCount, 0)

  const attention: AttentionItem[] = []
  if (pending.length > 0) {
    attention.push({
      id: "plan-payouts",
      label: `${pending.length} ${pending.length === 1 ? "payout" : "payouts"} to approve`,
      detail: money(pending.reduce((sum, w) => sum + w.netPayout, 0)),
      tone: "amber",
      onSelect: () => setTab("activity"),
    })
  }
  if (missed > 0) {
    attention.push({
      id: "plan-missed",
      label: `${missed} missed contributions`,
      detail: `${participants.filter((p) => p.state === "Behind").length} behind`,
      tone: "red",
      onSelect: () => setTab("contributors"),
    })
  }

  const statusItems = (["Paused", "Completed", "Closed"] as ContributionStatus[])
    .filter((status) => status !== contribution.status)
    .map((status) => ({ label: `Mark as ${status.toLowerCase()}`, onSelect: () => setStatus(ctx, contribution, status) }))
  if (contribution.status !== "Active") {
    statusItems.push({ label: "Reactivate", onSelect: () => setStatus(ctx, contribution, "Active") })
  }

  return (
    <>
      <ShellPage
        level="detail"
        title={contribution.name}
        description={contribution.description}
        meta={
          <>
            <ContributionTypeBadge type={contribution.type} />
            <FrequencyBadge contribution={contribution} />
            <ContributionStatusBadge status={contribution.status} />
            <RecipientNote recipient={contribution.recipient} />
          </>
        }
        actions={
          <div className="header-actions">
            {ctx.can("contributions.record_payment") && (
              <Button variant="secondary" icon={Plus} onClick={() => setModal({ kind: "payment", participantId: participants[0]?.id })}>
                Record payment
              </Button>
            )}
            {ctx.can("contributions.withdraw") && (
              <Button onClick={() => setModal({ kind: "withdraw" })}>Payout</Button>
            )}
            {ctx.can("contributions.close") && <ActionMenu label="Manage" items={statusItems} />}
          </div>
        }
      >
        <ModeBanner mode={ctx.mode} environment={ctx.environment} />

        <Tabs
          tabs={[
            { id: "overview" as DetailTab, label: "Overview" },
            { id: "contributors" as DetailTab, label: "Contributors", count: participants.length },
            { id: "activity" as DetailTab, label: "Activity", count: pending.length || undefined },
            { id: "reports" as DetailTab, label: "Reports" },
          ]}
          value={tab}
          onChange={setTab}
        />

        {attention.length > 0 && <AttentionRow items={attention} />}

        {tab === "overview" && (
          <PlanOverview
            ctx={ctx}
            contribution={contribution}
            balance={balance}
            contributorCount={participants.length}
            onViewContributors={() => setTab("contributors")}
          />
        )}
        {tab === "contributors" && (
          <PlanContributors
            ctx={ctx}
            contribution={contribution}
            onWithdraw={(participantId) => setModal({ kind: "withdraw", participantId })}
            onRecordPayment={(participantId) => setModal({ kind: "payment", participantId })}
          />
        )}
        {tab === "activity" && (
          <PlanActivity
            ctx={ctx}
            contributionId={contribution.id}
            onApprove={(withdrawal) => setDecision({ withdrawal, approve: true })}
            onReject={(withdrawal) => setDecision({ withdrawal, approve: false })}
          />
        )}
        {tab === "reports" && <PlanReports ctx={ctx} contributionId={contribution.id} />}
      </ShellPage>

      {modal?.kind === "payment" && (
        <RecordPaymentModal
          ctx={ctx}
          contribution={contribution}
          preselectedParticipantId={modal.participantId}
          notify={ctx.notify}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.kind === "withdraw" && (
        <WithdrawModal
          ctx={ctx}
          contribution={contribution}
          participantId={modal.participantId}
          notify={ctx.notify}
          onClose={() => setModal(null)}
        />
      )}
      {decision && (
        <WithdrawalDecisionModal
          ctx={ctx}
          contribution={contribution}
          withdrawal={decision.withdrawal}
          approve={decision.approve}
          onClose={() => setDecision(null)}
        />
      )}
    </>
  )
}

/** Plan-level "needs attention" — the same affordance the module front door uses. */
function AttentionRow({ items }: { items: AttentionItem[] }) {
  return (
    <section className="attention" aria-label="Needs attention">
      <span className="attention-lead">Needs attention</span>
      <div className="attention-items">
        {items.map((item) => (
          <button key={item.id} type="button" className="attention-item" data-tone={item.tone} onClick={item.onSelect}>
            <b>{item.label}</b>
            {item.detail}
          </button>
        ))}
      </div>
    </section>
  )
}

function setStatus(ctx: ContributionCtx, contribution: Contribution, status: ContributionStatus) {
  const fallback: Record<ContributionStatus, string> = {
    Active: "Plan reactivated",
    Paused: "Plan paused",
    Completed: "Plan completed",
    Closed: "Plan closed",
  }
  ctx.service
    .setStatus(contribution.organizationId, contribution.id, status, ctx.ctx)
    .then(() => {
      ctx.notify(fallback[status])
      ctx.retry()
    })
    .catch(() => ctx.notify("The status could not be changed."))
}
