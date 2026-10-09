import { useMemo } from "react"
import { money } from "@/features/loans/components/LoanUi"
import { useContributions } from "@/features/contributions/hooks/useContributions"
import { CONTRIBUTION_ORG_ID } from "@/features/contributions/constants"
import { useLoans } from "@/features/loans/hooks/useLoans"
import { todayISO } from "@/features/loans/domain/calculations"
import { contributionReminder, loanReminder } from "../domain/templates"
import type { MessageCategory, MessageContext } from "../types/message.types"

export interface GeneratedReminder {
  category: MessageCategory
  subject: string
  body: string
  /** The people the reminder is about, preselected in the picker. */
  memberIds: string[]
  context: MessageContext
}

/**
 * The two operational shortcuts.
 *
 * Choosing a plan or a loan is all it takes to produce a reminder: the wording comes from
 * `domain/templates`, the amount and due date come from the plan or loan itself, and the people it
 * concerns are preselected. Nothing is sent from here, and nothing is automated — the message lands
 * in the editor, where the administrator edits it and chooses who finally receives it.
 *
 * Each shortcut is mounted only when it is chosen, so the contribution and loan datasets are not
 * read until they are needed.
 */
export function ReminderPicker({
  kind,
  onGenerate,
}: {
  kind: Extract<MessageCategory, "Contribution reminder" | "Loan reminder">
  onGenerate: (reminder: GeneratedReminder) => void
}) {
  return kind === "Contribution reminder" ? (
    <ContributionReminderPicker onGenerate={onGenerate} />
  ) : (
    <LoanReminderPicker onGenerate={onGenerate} />
  )
}

function ContributionReminderPicker({ onGenerate }: { onGenerate: (reminder: GeneratedReminder) => void }) {
  const contributions = useContributions(CONTRIBUTION_ORG_ID)
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
