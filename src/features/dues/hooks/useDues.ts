import { useCallback, useEffect, useMemo, useState } from "react"
import { useWorkspace } from "@/app/providers/WorkspaceProvider"
import { useAuthorization } from "@/features/administrators/hooks/useAuthorization"
import { moneyMovementMode } from "@/lib/permissions/capabilities"
import {
  chargeStatus,
  participantTotals as participantTotalsOf,
  planTotals,
  summarizeDues,
  syncCharge,
  syncCharges,
} from "../domain/dues.rules"
import { toISODate } from "../domain/schedule"
import { duesService, type DuesActor, type MutationContext } from "../services/dues.service"
import type {
  DuesCharge,
  DuesDataset,
  DuesParticipant,
  DuesParticipantTotals,
  DuesPlan,
  DuesPlanTotals,
  DuesSummary,
  DuesTransaction,
} from "../types/dues.types"
/**
 * Loads the dues workspace and exposes the derived figures the UI needs.
 *
 * Components never touch the repository — they go through the hook, which goes through the service.
 * The hook also owns the automatic lien recovery subscription, because it is the layer that knows
 * the environment's money-movement mode.
 */
export function useDues(organizationId: string) {
  const [data, setData] = useState<DuesDataset | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const { administrator, can } = useAuthorization()
  const { state } = useWorkspace()
  useEffect(() => duesService.subscribe(() => setVersion((value) => value + 1)), [])
  useEffect(() => {
    let active = true
    duesService
      .load(organizationId)
      .then((dataset) => {
        if (!active) return
        setData(dataset)
        setError(null)
      })
      .catch(() => active && setError("Dues could not be loaded."))
    return () => {
      active = false
    }
  }, [version, organizationId])
  const today = toISODate(new Date())
  const retry = useCallback(() => setVersion((value) => value + 1), [])
  const actor = useMemo<DuesActor>(
    () => ({ id: administrator.id, name: administrator.name }),
    [administrator.id, administrator.name],
  )
  const mode = moneyMovementMode(state.environment)
  const ctx = useMemo<MutationContext>(() => ({ actor, mode }), [actor, mode])
  // Outstanding dues are collected as soon as money reaches a member's wallet. In an environment
  // that may not move money there is nothing to collect, so the subscription is not even started.
  useEffect(() => {
    if (mode === "blocked") return
    return duesService.startAutoRecovery(organizationId, mode)
  }, [organizationId, mode])
  const chargesFor = useCallback(
    (planId: string) => data?.charges.filter((charge) => charge.duesPlanId === planId) ?? [],
    [data],
  )
  const participantsFor = useCallback(
    (planId: string) => data?.participants.filter((participant) => participant.duesPlanId === planId) ?? [],
    [data],
  )
  const transactionsFor = useCallback(
    (planId: string) => data?.transactions.filter((transaction) => transaction.duesPlanId === planId) ?? [],
    [data],
  )
  /** The plan's charges with their state and lien judged against today. */
  const syncedChargesFor = useCallback(
    (plan: DuesPlan): DuesCharge[] => syncCharges(chargesFor(plan.id), [plan], today),
    [chargesFor, today],
  )
  const summary = useMemo<DuesSummary | null>(() => (data ? summarizeDues(data, today) : null), [data, today])
  const totalsFor = useCallback(
    (plan: DuesPlan): DuesPlanTotals => planTotals(plan, data?.participants ?? [], data?.charges ?? [], today),
    [data, today],
  )
  const participantTotalsFor = useCallback(
    (participant: DuesParticipant): DuesParticipantTotals =>
      participantTotalsOf(participant, data?.charges ?? [], data?.plans ?? [], today),
    [data, today],
  )
  const statusFor = useCallback((charge: DuesCharge, plan: DuesPlan) => chargeStatus(charge, plan, today), [today])
  const syncedCharge = useCallback((charge: DuesCharge, plan: DuesPlan) => syncCharge(charge, plan, today), [today])
  const transactionsForMember = useCallback(
    (memberId: string) =>
      (data?.transactions ?? []).filter((transaction) => transaction.memberId === memberId) as DuesTransaction[],
    [data],
  )
  return {
    data,
    error,
    retry,
    service: duesService,
    can,
    actor,
    ctx,
    mode,
    /** The tenant this data belongs to, so a mutation can name it without a second hook call. */
    organizationId,
    environment: state.environment,
    enabledModules: new Set(state.enabledModules),
    today,
    summary,
    plans: data?.plans ?? [],
    chargesFor,
    syncedChargesFor,
    participantsFor,
    transactionsFor,
    transactionsForMember,
    totalsFor,
    participantTotalsFor,
    statusFor,
    syncedCharge,
  }
}
