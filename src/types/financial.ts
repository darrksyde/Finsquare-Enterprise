import type { EntityId } from "./common"

export interface Money {
  amount: number
  currency: string
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
