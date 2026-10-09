import { branchesMock } from "@/features/branches/mocks/branches.mock"

export function useWalletBranches() {
  return branchesMock.filter((b) => b.status === "active")
}
