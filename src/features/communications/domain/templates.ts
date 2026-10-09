import { money } from "@/features/wallet/domain/wallet.rules"
import type { MessageCategory } from "../types/message.types"
import { NAME_TOKEN } from "./messaging"

/**
 * The two operational reminders, written the way the brief specifies. They are plain strings with
 * the `{name}` token — an administrator edits any part of them before sending. Nothing here is an
 * automation: choosing a plan or a loan generates text and preselects people, nothing more.
 */

const MS_PER_DAY = 86_400_000

/** Whole days from `today` to `dueDate`; negative when the due date has passed. */
function daysUntil(dueDate: string, today: string): number {
  const from = new Date(`${today.slice(0, 10)}T00:00:00Z`).getTime()
  const to = new Date(`${dueDate.slice(0, 10)}T00:00:00Z`).getTime()
  return Math.round((to - from) / MS_PER_DAY)
}

const longDate = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  })

/**
 * How a due date reads in a sentence: "due today", "due tomorrow", "due on 10 October",
 * "overdue since 1 October". A reminder written on the day it is due must not say "due on 5 October".
 */
export function duePhrase(dueDate: string, today: string): string {
  const days = daysUntil(dueDate, today)
  if (days === 0) return "due today"
  if (days === 1) return "due tomorrow"
  if (days > 1) return `due on ${longDate(dueDate)}`
  if (days === -1) return "overdue since yesterday"
  return `overdue since ${longDate(dueDate)}`
}

export interface ReminderDraft {
  category: MessageCategory
  subject: string
  body: string
}

/**
 * "Hi David, your ₦2,000 contribution to Ikeja Daily Ajo Savings is due today. Please make your
 * contribution through your FinSquare wallet."
 *
 * `amount` is omitted for a plan whose contributors pay different amounts (Flexible, Target): the
 * message then says "your contribution" rather than stating a figure that is wrong for somebody.
 */
export function contributionReminder(input: {
  amount?: number
  contributionName: string
  dueDate: string
  today: string
}): ReminderDraft {
  const { amount, contributionName, dueDate, today } = input
  const subject = amount
    ? `Contribution reminder — ${money(amount)} · ${contributionName}`
    : `Contribution reminder — ${contributionName}`
  const what = amount ? `your ${money(amount)} contribution to ${contributionName}` : `your contribution to ${contributionName}`
  return {
    category: "Contribution reminder",
    subject,
    body: `Hi ${NAME_TOKEN}, ${what} is ${duePhrase(dueDate, today)}. Please make your contribution through your FinSquare wallet.`,
  }
}

/**
 * "Hi David, your loan repayment of ₦20,000 is due on 10 October. Please make your payment before
 * the due date."
 */
export function loanReminder(input: {
  amount: number
  productName: string
  dueDate: string
  today: string
  reference?: string
}): ReminderDraft {
  const { amount, productName, dueDate, today, reference } = input
  return {
    category: "Loan reminder",
    subject: reference ? `Loan repayment due — ${reference}` : `Loan repayment due — ${productName}`,
    body: `Hi ${NAME_TOKEN}, your loan repayment of ${money(amount)} is ${duePhrase(dueDate, today)}. Please make your payment before the due date.`,
  }
}
