import { useState } from "react"
import { useWorkspace } from "@/app/providers/WorkspaceProvider"
import { getUserErrorMessage } from "@/lib/errors/get-user-message"
import { authService } from "../services/auth.service"
import type { LoginOutcome, SignInCredentials } from "../types"

/** Sign in and out of the workspace. The session lives in `WorkspaceProvider`, so it is not persisted. */
export function useAuth() {
  const { state, dispatch } = useWorkspace()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)
  const [changePasswordError, setChangePasswordError] = useState("")

  const signIn = async (credentials: SignInCredentials): Promise<LoginOutcome> => {
    setPending(true)
    setError("")
    try {
      const outcome = await authService.signIn(credentials)
      if (outcome.status === "needs-selection") {
        return { needsSelection: true, communities: outcome.communities }
      }
      dispatch({ type: "auth/signed-in", value: outcome.result.session })
      if (outcome.result.memberships.length) {
        dispatch({ type: "communities/synced", value: outcome.result.memberships })
      }
      return { needsSelection: false }
    } catch (cause) {
      setError(getUserErrorMessage(cause))
      return { needsSelection: false }
    } finally {
      setPending(false)
    }
  }

  const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    setChangingPassword(true)
    setChangePasswordError("")
    try {
      await authService.changePassword(currentPassword, newPassword)
      if (state.session) {
        dispatch({ type: "auth/signed-in", value: { ...state.session, mustChangePassword: false } })
      }
      return true
    } catch (cause) {
      setChangePasswordError(getUserErrorMessage(cause))
      return false
    } finally {
      setChangingPassword(false)
    }
  }

  const signOut = async () => {
    await authService.signOut()
    dispatch({ type: "auth/signed-out" })
  }

  return { signIn, signOut, changePassword, pending, error, changingPassword, changePasswordError }
}
