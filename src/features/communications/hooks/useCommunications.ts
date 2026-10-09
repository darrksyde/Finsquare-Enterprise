import { useCallback, useEffect, useMemo } from "react"
import { useWorkspace } from "@/app/providers/WorkspaceProvider"
import { useAuthorization } from "@/features/administrators/hooks/useAuthorization"
import { useBranches } from "@/features/branches/hooks/useBranches"
import { useGroups } from "@/features/groups/hooks/useGroups"
import { useMembers } from "@/features/members/hooks/useMembers"
import { organizationWallets } from "@/features/wallet/domain/wallet.rules"
import { useWallet } from "@/features/wallet/hooks/useWallet"
import { useAsyncResource } from "@/hooks/useAsyncResource"
import { moneyMovementMode } from "@/lib/permissions/capabilities"
import { COMMUNICATION_ORG_ID } from "../constants"
import { smsRemaining } from "../domain/messaging"
import {
  communicationsService,
  summarizeMessages,
  type CommunicationContext,
} from "../services/communications.service"
import type { Message, MessageSummary, SendMessageInput } from "../types/message.types"

/**
 * The messaging workspace for one organization: the message history and SMS balance, the people it
 * can send to, and the two commands that move anything.
 *
 * The recipient directory deliberately reuses the members, groups and branches hooks rather than
 * reading their mocks, so a member added in Members is messageable here straight away.
 */
export function useCommunications() {
  const resource = useAsyncResource(
    () => communicationsService.load(COMMUNICATION_ORG_ID),
    [COMMUNICATION_ORG_ID],
  )
  const { administrator, can } = useAuthorization()
  const { state } = useWorkspace()
  const members = useMembers(COMMUNICATION_ORG_ID)
  const groups = useGroups(COMMUNICATION_ORG_ID)
  const branches = useBranches(COMMUNICATION_ORG_ID)
  const wallet = useWallet()

  const { refresh } = resource
  useEffect(() => communicationsService.subscribe(refresh), [refresh])

  const ctx = useMemo<CommunicationContext>(
    () => ({
      actor: { id: administrator.id, name: administrator.name },
      mode: moneyMovementMode(state.environment),
    }),
    [administrator.id, administrator.name, state.environment],
  )

  const data = resource.data
  const summary: MessageSummary = useMemo(() => summarizeMessages(data?.messages ?? []), [data])

  /**
   * Sending and topping up both change the SMS balance, so both refresh the workspace. A top-up
   * also changes the wallet, which has its own loader.
   */
  const sendMessage = useCallback(
    async (input: SendMessageInput): Promise<Message> => {
      const message = await communicationsService.sendMessage(COMMUNICATION_ORG_ID, input, ctx)
      refresh()
      return message
    },
    [ctx, refresh],
  )

  const topUpBalance = useCallback(
    async (input: { amount: number; walletId: string }) => {
      const result = await communicationsService.topUpBalance(COMMUNICATION_ORG_ID, input, ctx)
      refresh()
      wallet.retry()
      return result
    },
    [ctx, refresh, wallet],
  )

  const wallets = wallet.wallets

  return {
    data,
    status: resource.status,
    error: resource.error,
    retry: refresh,
    summary,
    service: communicationsService,
    can,
    ctx,
    mode: ctx.mode,
    environment: state.environment,
    enabledModules: state.enabledModules,
    account: data?.account,
    messages: data?.messages ?? [],
    smsLeft: data ? smsRemaining(data.account.balance, data.account.costPerSms) : 0,
    members: members.members,
    groups: groups.groups,
    branches: branches.branches,
    /** Only real wallets can fund the balance — a member wallet is not a treasury. */
    fundingWallets: wallet.data ? organizationWallets(wallets) : [],
    canSpendFrom: (walletId: string) => {
      const row = wallets.find((candidate) => candidate.id === walletId)
      return row ? wallet.canOn(row, "wallet.withdraw") : false
    },
    sendMessage,
    topUpBalance,
  }
}

export type CommunicationsCtx = ReturnType<typeof useCommunications>
