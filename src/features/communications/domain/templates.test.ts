import { describe, expect, it } from "vitest"
import { contributionReminder, duePhrase, loanReminder } from "./templates"

const TODAY = "2026-10-05"

describe("duePhrase", () => {
  it("says 'due today' on the day itself", () => {
    expect(duePhrase("2026-10-05", TODAY)).toBe("due today")
  })

  it("says 'due tomorrow' the day before", () => {
    expect(duePhrase("2026-10-06", TODAY)).toBe("due tomorrow")
  })

  it("names the day further out", () => {
    expect(duePhrase("2026-10-10", TODAY)).toBe("due on 10 October")
    expect(duePhrase("2026-11-01", TODAY)).toBe("due on 1 November")
  })

  it("says 'overdue since yesterday' the day after", () => {
    expect(duePhrase("2026-10-04", TODAY)).toBe("overdue since yesterday")
  })

  it("names the day for older arrears", () => {
    expect(duePhrase("2026-10-01", TODAY)).toBe("overdue since 1 October")
    expect(duePhrase("2026-08-30", TODAY)).toBe("overdue since 30 August")
  })
})

describe("contributionReminder", () => {
  it("reads like the brief's example", () => {
    const draft = contributionReminder({
      amount: 2_000,
      contributionName: "Ikeja Daily Ajo Savings",
      dueDate: TODAY,
      today: TODAY,
    })
    expect(draft.body).toBe(
      "Hi {name}, your ₦2,000 contribution to Ikeja Daily Ajo Savings is due today. Please make your contribution through your FinSquare wallet.",
    )
    expect(draft.category).toBe("Contribution reminder")
    expect(draft.subject).toBe("Contribution reminder — ₦2,000 · Ikeja Daily Ajo Savings")
  })

  it("omits the figure when the plan's contributors pay different amounts", () => {
    const draft = contributionReminder({
      contributionName: "Flexible Welfare Fund",
      dueDate: TODAY,
      today: TODAY,
    })
    expect(draft.body).toBe(
      "Hi {name}, your contribution to Flexible Welfare Fund is due today. Please make your contribution through your FinSquare wallet.",
    )
    expect(draft.subject).toBe("Contribution reminder — Flexible Welfare Fund")
  })

  it("keeps the {name} token so a bulk send greets each person", () => {
    const draft = contributionReminder({
      amount: 5_000,
      contributionName: "Welfare Fund",
      dueDate: "2026-10-10",
      today: TODAY,
    })
    expect(draft.body).toContain("{name}")
    expect(draft.body).toContain("due on 10 October")
  })
})

describe("loanReminder", () => {
  it("reads like the brief's example", () => {
    const draft = loanReminder({
      amount: 20_000,
      productName: "Business Loan",
      dueDate: "2026-10-10",
      today: TODAY,
      reference: "LN-5001",
    })
    expect(draft.body).toBe(
      "Hi {name}, your loan repayment of ₦20,000 is due on 10 October. Please make your payment before the due date.",
    )
    expect(draft.category).toBe("Loan reminder")
    expect(draft.subject).toBe("Loan repayment due — LN-5001")
  })

  it("falls back to the product name when there is no reference", () => {
    const draft = loanReminder({
      amount: 8_000,
      productName: "Emergency Loan",
      dueDate: "2026-10-04",
      today: TODAY,
    })
    expect(draft.subject).toBe("Loan repayment due — Emergency Loan")
    expect(draft.body).toContain("overdue since yesterday")
  })
})
