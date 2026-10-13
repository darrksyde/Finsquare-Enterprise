import { useState } from "react"
import { useWorkspace } from "@/app/providers/WorkspaceProvider"
import { getUserErrorMessage } from "@/lib/errors/get-user-message"
import { authService } from "../services/auth.service"
import type { SignInCredentials } from "../types"

/** Sign in and out of the workspace. The session lives in `WorkspaceProvider`, so it is not persisted. */
export function useAuth() {
  const { dispatch } = useWorkspace()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  const signIn = async (credentials: SignInCredentials): Promise<boolean> => {
    setPending(true)
    setError("")
    try {
      const session = await authService.signIn(credentials)
      dispatch({ type: "auth/signed-in", value: session })
      return true
    } catch (cause) {
      setError(getUserErrorMessage(cause))
      return false
    } finally {
      setPending(false)
    }
  }

  const signOut = async () => {
    await authService.signOut()
    dispatch({ type: "auth/signed-out" })
  }

  return { signIn, signOut, pending, error }
}
