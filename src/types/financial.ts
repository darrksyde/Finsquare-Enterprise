import type { EntityId } from "./common"

export interface Money {
  amount: number
  currency: string
}

export interface DuesScheme {
  id: EntityId
  name: string
  amount: Money
  frequency: "weekly" | "monthly" | "quarterly" | "annual"
  eligibleMemberIds: EntityId[]
  status: "draft" | "active" | "archived"
  dueDate: string
}

export interface LoanProduct {
  id: EntityId
  name: string
  minimumAmount: Money
  maximumAmount: Money
  minimumDurationMonths: number
  maximumDurationMonths: number
  interestRate: number
  status: "draft" | "published" | "archived"
}
