import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuthorization } from "@/features/administrators/hooks/useAuthorization"
import { rolesMock } from "@/features/administrators/mocks/administrators.mock"
import { useWorkspace } from "@/app/providers/WorkspaceProvider"
import { moneyMovementMode } from "@/lib/permissions/capabilities"
import { canOnWallet, visibleWallets, walletsWith, type Principal } from "../domain/wallet.rules"
import { walletService } from "../services/wallet.service"
import type { Actor, Wallet, WalletDataset, WalletPermission } from "../types/wallet.types"

export function useWallet() {
  const [data, setData] = useState<WalletDataset | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const { administrator, can } = useAuthorization()
  const { state } = useWorkspace()

  useEffect(() => walletService.subscribe(() => setVersion((v) => v + 1)), [])
  useEffect(() => {
    let active = true
    walletService.load().then((d) => active && (setData(d), setError(null))).catch(() => active && setError("Wallet data could not be loaded."))
    return () => { active = false }
  }, [version])

  const principal = useMemo<Principal>(() => ({ administrator, roles: rolesMock }), [administrator])
  const actor = useMemo<Actor>(() => ({ id: administrator.id, name: administrator.name }), [administrator])
  const mode = moneyMovementMode(state.environment)
  const retry = useCallback(() => setVersion((v) => v + 1), [])

  return {
    data, error, retry, service: walletService, actor, can, mode, environment: state.environment, principal,
    wallets: data ? visibleWallets(data, principal) : ([] as Wallet[]),
    walletsWith: (p: WalletPermission) => (data ? walletsWith(data, principal, p) : ([] as Wallet[])),
    canOn: (w: Wallet, p: WalletPermission) => (data ? canOnWallet(data, principal, w, p) : false),
  }
}
