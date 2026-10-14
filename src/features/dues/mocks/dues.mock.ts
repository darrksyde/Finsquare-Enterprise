import { membersMock } from "@/features/members/mocks/members.mock"
import { SEED_ORGANIZATION_ID } from "@/lib/tenancy/seed-tenant"
import { syncCharge } from "../domain/dues.rules"
import { addDays, generateCharges, parseISODate, toISODate } from "../domain/schedule"
import type {
  DuesCharge,
  DuesDataset,
  DuesFrequency,
  DuesLienRules,
  DuesParticipant,
  DuesPaymentMethod,
  DuesPlan,
  DuesPlanStatus,
  DuesScope,
  DuesTransaction,
  DuesTransactionType,
} from "../types/dues.types"
/**
 * Mock dues data. It models realistic backend responses: charges are generated from each plan's own
 * schedule and every recorded payment writes both the charge's `paidAmount` and a transaction, so
 * the ledger, the reports and the dashboard cannot disagree with each other.
 */
export const DUES_CREATED_BY = "Adesola Ogunleye"
export const DUES_PLAN_IDS = {
  monthly: "dues-monthly-association",
  weekly: "dues-weekly-security",
  annual: "dues-annual-renewal",
} as const
const RULES_LIEN: DuesLienRules = {
  enabled: true,
  graceDays: 5,
  autoRecover: true,
}
const RULES_TRACK_ONLY: DuesLienRules = {
  enabled: false,
  graceDays: 0,
  autoRecover: false,
}
const RULES_MANUAL_RECOVERY: DuesLienRules = {
  enabled: true,
  graceDays: 14,
  autoRecover: false,
}
interface PlanSeed {
  id: string
  name: string
  description: string
  amount: number
  frequency: DuesFrequency
  customFrequency?: {
    label: string
    days: number
  }
  startDaysAgo: number
  /** When omitted the plan runs indefinitely and a rolling horizon of charges is generated. */
  endDaysAhead?: number
  scope: DuesScope
  groupId?: string
  groupName?: string
  branchId?: string
  branchName?: string
  lien: DuesLienRules
  status: DuesPlanStatus
  memberIds: string[]
}
const PLAN_SEEDS: PlanSeed[] = [
  {
    id: DUES_PLAN_IDS.monthly,
    name: "Monthly Association Dues",
    description: "Monthly obligations for all active cooperative members.",
    amount: 2000,
    frequency: "Monthly",
    startDaysAgo: 150,
    scope: "All",
    lien: RULES_LIEN,
    status: "Active",
    memberIds: ["LFC-002481", "LFC-002479", "LFC-002451"],
  },
  {
    id: DUES_PLAN_IDS.weekly,
    name: "Weekly Security Levy",
    description: "Weekly levy collected from the Ikeja Savings Group.",
    amount: 500,
    frequency: "Weekly",
    startDaysAgo: 56,
    endDaysAhead: 28,
    scope: "Group",
    groupId: "group-ikeja-savings",
    groupName: "Ikeja Savings Group",
    lien: RULES_TRACK_ONLY,
    status: "Active",
    memberIds: ["LFC-002481", "LFC-002479"],
  },
  {
    id: DUES_PLAN_IDS.annual,
    name: "Annual Membership Renewal",
    description: "Yearly renewal for the members the committee selected.",
    amount: 25000,
    frequency: "Yearly",
    startDaysAgo: 95,
    scope: "Selected",
    lien: RULES_MANUAL_RECOVERY,
    status: "Active",
    memberIds: ["LFC-002462", "LFC-002426"],
  },
]
interface PaymentSeed {
  planId: string
  memberId: string
  /** How many of the member's due charges are settled in full, oldest first. */
  settleCount: number
  /** When set, part-pay the next charge, so a partially paid charge exists. */
  partialAmount?: number
  method: DuesPaymentMethod
  type: DuesTransactionType
}
const PAYMENT_SEEDS: PaymentSeed[] = [
  {
    planId: DUES_PLAN_IDS.monthly,
    memberId: "LFC-002481",
    settleCount: 99,
    method: "cash",
    type: "Payment",
  },
  {
    planId: DUES_PLAN_IDS.monthly,
    memberId: "LFC-002479",
    settleCount: 2,
    partialAmount: 500,
    method: "wallet",
    type: "Wallet recovery",
  },
  {
    planId: DUES_PLAN_IDS.monthly,
    memberId: "LFC-002451",
    settleCount: 1,
    method: "bank_transfer",
    type: "Payment",
  },
  {
    planId: DUES_PLAN_IDS.weekly,
    memberId: "LFC-002481",
    settleCount: 6,
    method: "cash",
    type: "Payment",
  },
  {
    planId: DUES_PLAN_IDS.weekly,
    memberId: "LFC-002479",
    settleCount: 3,
    method: "bank_transfer",
    type: "Payment",
  },
  {
    planId: DUES_PLAN_IDS.annual,
    memberId: "LFC-002426",
    settleCount: 1,
    method: "bank_transfer",
    type: "Payment",
  },
]
const reference = (sequence: number) => `DSQ-${String(100000 + sequence)}`
function makeTransaction(input: {
  plan: DuesPlan
  participant: DuesParticipant
  charge: DuesCharge
  amount: number
  method: DuesPaymentMethod
  type: DuesTransactionType
  date: string
  sequence: number
}): DuesTransaction {
  const { plan, participant, charge, amount, method, type, date, sequence } = input
  return {
    id: `dtx-${plan.id}-${participant.memberId}-${charge.periodKey}`,
    organizationId: SEED_ORGANIZATION_ID,
    reference: reference(sequence),
    duesPlanId: plan.id,
    participantId: participant.id,
    memberId: participant.memberId,
    memberName: participant.memberName,
    chargeId: charge.id,
    periodKey: charge.periodKey,
    type,
    method,
    amount,
    direction: "credit",
    status: "Completed",
    date,
    recordedBy: DUES_CREATED_BY,
    simulated: false,
  }
}
export function buildDuesDataset(
  options: {
    today?: string
    maxPeriods?: number
  } = {},
): DuesDataset {
  const today = options.today ?? toISODate(new Date())
  const todayDate = parseISODate(today)
  const plans: DuesPlan[] = PLAN_SEEDS.map((seed) => ({
    id: seed.id,
    organizationId: SEED_ORGANIZATION_ID,
    name: seed.name,
    description: seed.description,
    amount: seed.amount,
    currency: "NGN",
    frequency: seed.frequency,
    customFrequency: seed.customFrequency,
    startDate: toISODate(addDays(todayDate, -seed.startDaysAgo)),
    endDate: seed.endDaysAhead === undefined ? undefined : toISODate(addDays(todayDate, seed.endDaysAhead)),
    scope: seed.scope,
    groupId: seed.groupId,
    groupName: seed.groupName,
    branchId: seed.branchId,
    branchName: seed.branchName,
    lien: seed.lien,
    status: seed.status,
    createdAt: toISODate(addDays(todayDate, -seed.startDaysAgo)),
    createdBy: DUES_CREATED_BY,
  }))
  const participants: DuesParticipant[] = []
  for (const seed of PLAN_SEEDS) {
    const plan = plans.find((candidate) => candidate.id === seed.id)
    if (!plan) continue
    for (const memberId of seed.memberIds) {
      const member = membersMock.find((candidate) => candidate.id === memberId)
      if (!member) continue
      participants.push({
        id: `${plan.id}:${memberId}`,
        organizationId: SEED_ORGANIZATION_ID,
        duesPlanId: plan.id,
        memberId: member.id,
        memberName: member.name,
        memberCode: member.id,
        branchId: member.branchId,
        branchName: member.branchName,
        phone: member.phone,
        joinedAt: plan.startDate,
      })
    }
  }
  const charges = plans.flatMap((plan) =>
    generateCharges(
      plan,
      participants
        .filter((participant) => participant.duesPlanId === plan.id)
        .map((participant) => ({
          id: participant.id,
          memberId: participant.memberId,
        })),
      today,
      { maxPeriods: options.maxPeriods ?? 400 },
    ),
  )
  const ledger = new Map(charges.map((charge) => [charge.id, charge]))
  const transactions: DuesTransaction[] = []
  let sequence = 0
  for (const seed of PAYMENT_SEEDS) {
    const plan = plans.find((candidate) => candidate.id === seed.planId)
    const participant = participants.find(
      (candidate) => candidate.duesPlanId === seed.planId && candidate.memberId === seed.memberId,
    )
    if (!plan || !participant) continue
    const due = [...ledger.values()]
      .filter(
        (charge) => charge.duesPlanId === plan.id && charge.participantId === participant.id && charge.dueDate <= today,
      )
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    for (const charge of due.slice(0, seed.settleCount)) {
      charge.paidAmount = charge.expectedAmount
      transactions.push(
        makeTransaction({
          plan,
          participant,
          charge,
          amount: charge.expectedAmount,
          method: seed.method,
          type: seed.type,
          date: charge.dueDate,
          sequence: (sequence += 1),
        }),
      )
    }
    const partial = due[seed.settleCount]
    if (partial && seed.partialAmount) {
      partial.paidAmount = seed.partialAmount
      transactions.push(
        makeTransaction({
          plan,
          participant,
          charge: partial,
          amount: seed.partialAmount,
          method: seed.method,
          type: seed.type,
          date: partial.dueDate,
          sequence: (sequence += 1),
        }),
      )
    }
  }
  const plansById = new Map(plans.map((plan) => [plan.id, plan]))
  const synced = [...ledger.values()].map((charge) =>
    syncCharge(charge, plansById.get(charge.duesPlanId) ?? plans[0], today),
  )
  return { plans, participants, charges: synced, transactions }
}
