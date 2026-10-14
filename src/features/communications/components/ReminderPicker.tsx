import { useMemo, useState } from "react"
import { money } from "@/features/loans/components/LoanUi"
import { useContributions } from "@/features/contributions/hooks/useContributions"
import { useOrganizationId } from "@/hooks/useOrganizationId"
import { useDues } from "@/features/dues/hooks/useDues"
import { outstandingOf } from "@/features/dues/domain/dues.rules"
import { round2 } from "@/features/dues/domain/schedule"
import { useLoans } from "@/features/loans/hooks/useLoans"
import { todayISO } from "@/features/loans/domain/calculations"
import { contributionReminder, duesReminder, loanReminder } from "../domain/templates"
import type { MessageCategory, MessageContext } from "../types/message.types"

export interface GeneratedReminder {
  category: MessageCategory
  subject: string
  body: string
  /** The people the reminder is about, preselected in the picker. */
  memberIds: string[]
  context: MessageContext
}

/** Which of a member's charges a dues reminder is about. */
type DuesBucket = "Upcoming" | "Outstanding" | "Overdue"

/**
 * The operational shortcuts.
 *
 * Choosing a plan or a loan is all it takes to produce a reminder: the wording comes from
 * `domain/templates`, the amount and due date come from the plan or loan itself, and the people it
 * concerns are preselected. Nothing is sent from here, and nothing is automated — the message lands
 * in the editor, where the administrator edits it and chooses who finally receives it.
 *
 * Each shortcut is mounted only when it is chosen, so the contribution, loan and dues datasets are
 * not read until they are needed.
 */
export function ReminderPicker({
  kind,
  onGenerate,
}: {
  kind: Extract<MessageCategory, "Contribution reminder" | "Loan reminder" | "Dues reminder">
  onGenerate: (reminder: GeneratedReminder) => void
}) {
  if (kind === "Contribution reminder") return <ContributionReminderPicker onGenerate={onGenerate} />
  if (kind === "Dues reminder") return <DuesReminderPicker onGenerate={onGenerate} />
  return <LoanReminderPicker onGenerate={onGenerate} />
}

function ContributionReminderPicker({ onGenerate }: { onGenerate: (reminder: GeneratedReminder) => void }) {
  const organizationId = useOrganizationId()
  const contributions = useContributions(organizationId)
  const today = todayISO()

  const plans = useMemo(
    () => contributions.contributions.filter((plan) => plan.status === "Active"),
    [contributions.contributions],
  )

  const choose = (contributionId: string) => {
    const plan = plans.find((candidate) => candidate.id === contributionId)
    if (!plan) return
    const schedule = contributions.scheduleFor(plan)
    // Flexible and Target plans ask different people for different amounts, so the figure is only
    // stated when every contributor owes the same one.
    const amount = plan.type === "Fixed" ? (plan.fixedAmount ?? undefined) : undefined
    const draft = contributionReminder({
      amount,
      contributionName: plan.name,
      dueDate: schedule?.nextDueDate ?? today,
      today,
    })
    const memberIds = contributions
      .participantsFor(plan.id)
      .map((participant) => participant.memberId)
      .filter((memberId): memberId is string => Boolean(memberId))
    onGenerate({
      ...draft,
      memberIds,
      context: { contributionId: plan.id, contributionName: plan.name },
    })
  }

  if (contributions.error) {
    return <p className="contribution-hint">{contributions.error}</p>
  }

  return (
    <div className="create-question">
      <div className="create-q">Which contribution?</div>
      <div className="contribution-filters">
        <select
          aria-label="Contribution to remind about"
          value=""
          onChange={(event) => {
            if (event.target.value) choose(event.target.value)
          }}
        >
          <option value="">Choose a contribution…</option>
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name}
              {plan.type === "Fixed" && plan.fixedAmount ? ` — ${money(plan.fixedAmount)}` : ""}
            </option>
          ))}
        </select>
        <span className="contribution-sub">
          {plans.length} active {plans.length === 1 ? "plan" : "plans"} · every contributor is preselected
        </span>
      </div>
      <p className="contribution-hint">
        The due date and amount come from the plan. Edit the message and the recipients before sending.
      </p>
    </div>
  )
}

/**
 * Dues reminders: choose the plan and what the message is about — a period falling due, what is
 * outstanding, or what is overdue — and the affected members are preselected with the figure the
 * plan states. When affected members owe different totals the amount is left out rather than
 * naming a figure that is wrong for somebody.
 */
function DuesReminderPicker({ onGenerate }: { onGenerate: (reminder: GeneratedReminder) => void }) {
  const organizationId = useOrganizationId()
  const dues = useDues(organizationId)
  const today = todayISO()
  const [bucket, setBucket] = useState<DuesBucket>("Outstanding")
  const [planId, setPlanId] = useState("")

  const plans = useMemo(() => dues.plans.filter((plan) => plan.status === "Active"), [dues.plans])

  const generate = (nextPlanId: string, nextBucket: DuesBucket) => {
    const plan = plans.find((candidate) => candidate.id === nextPlanId)
    if (!plan) return
    const charges = dues.syncedChargesFor(plan)
    const due = charges.filter((charge) => charge.dueDate <= today && outstandingOf(charge) > 0)
    const pool =
      nextBucket === "Upcoming"
        ? charges.filter((charge) => charge.dueDate > today && outstandingOf(charge) > 0)
        : nextBucket === "Overdue"
          ? due.filter((charge) => charge.state === "Overdue")
          : due

    const byMember = new Map<string, number>()
    for (const charge of pool) {
      byMember.set(charge.memberId, round2((byMember.get(charge.memberId) ?? 0) + outstandingOf(charge)))
    }
    const totals = [...byMember.values()]
    const everyoneOwesTheSame = totals.length > 0 && totals.every((total) => total === totals[0])
    const nextDueDate = [...pool].map((charge) => charge.dueDate).sort()[0]

    const draft = duesReminder({
      amount: plan.amount,
      planName: plan.name,
      dueDate: nextBucket === "Overdue" ? undefined : nextDueDate,
      today,
      outstanding: nextBucket === "Upcoming" || !everyoneOwesTheSame ? undefined : totals[0],
    })
    onGenerate({
      ...draft,
      memberIds: [...byMember.keys()],
      context: { duesPlanId: plan.id, duesPlanName: plan.name },
    })
  }

  if (dues.error) {
    return <p className="contribution-hint">{dues.error}</p>
  }

  return (
    <div className="create-question">
      <div className="create-q">Which dues?</div>
      <div className="contribution-filters">
        <select
          aria-label="Dues plan to remind about"
          value={planId}
          onChange={(event) => {
            setPlanId(event.target.value)
            if (event.target.value) generate(event.target.value, bucket)
          }}
        >
          <option value="">Choose a dues plan…</option>
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name} — {money(plan.amount)} {plan.frequency.toLowerCase()}
            </option>
          ))}
        </select>
        <select
          aria-label="What the reminder is about"
          value={bucket}
          onChange={(event) => {
            const next = event.target.value as DuesBucket
            setBucket(next)
            if (planId) generate(planId, next)
          }}
        >
          <option value="Upcoming">A period falling due</option>
          <option value="Outstanding">Everything outstanding</option>
          <option value="Overdue">Overdue dues only</option>
        </select>
        <span className="contribution-sub">
          {plans.length} active {plans.length === 1 ? "plan" : "plans"}
        </span>
      </div>
      <p className="contribution-hint">
        The amount and due date come from the plan and its charge ledger. Only the members the message is about are
        preselected. Edit the message and the recipients before sending.
      </p>
    </div>
  )
}

function LoanReminderPicker({ onGenerate }: { onGenerate: (reminder: GeneratedReminder) => void }) {
  const loans = useLoans()
  const today = todayISO()

  const open = useMemo(
    () =>
      (loans.data?.loans ?? []).filter(
        (loan) => loan.status !== "Completed" && loan.status !== "Written Off" && loan.outstanding > 0,
      ),
    [loans.data],
  )

  const choose = (loanId: string) => {
    const loan = open.find((candidate) => candidate.id === loanId)
    if (!loan) return
    const draft = loanReminder({
      amount: loan.nextDueAmount || loan.outstanding,
      productName: loan.productName,
      dueDate: loan.nextDueDate ?? today,
      today,
      reference: loan.reference,
    })
    onGenerate({
      ...draft,
      // One loan is one borrower, so the amount and due date in the message are exact.
      memberIds: loan.borrower.memberId ? [loan.borrower.memberId] : [],
      context: { loanId: loan.id, loanReference: loan.reference },
    })
  }

  if (loans.error) {
    return <p className="contribution-hint">{loans.error}</p>
  }

  return (
    <div className="create-question">
      <div className="create-q">Which loan?</div>
      <div className="contribution-filters">
        <select
          aria-label="Loan to remind about"
          value=""
          onChange={(event) => {
            if (event.target.value) choose(event.target.value)
          }}
        >
          <option value="">Choose a loan…</option>
          {open.map((loan) => (
            <option key={loan.id} value={loan.id}>
              {loan.borrower.name} — {loan.reference} · {money(loan.nextDueAmount || loan.outstanding)}
              {loan.daysOverdue > 0 ? ` · ${loan.daysOverdue} days overdue` : ""}
            </option>
          ))}
        </select>
        <span className="contribution-sub">
          {open.length} open {open.length === 1 ? "loan" : "loans"}
        </span>
      </div>
      <p className="contribution-hint">
        The borrower is preselected and the figure is their next instalment. Edit before sending.
      </p>
    </div>
  )
}
