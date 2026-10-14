import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react"
import { isCustomAccent, resolveAccent, type ThemeName } from "@/lib/theme/accent"
import {
  loadWorkspaceStore,
  persistWorkspaceStore,
  workspaceReducer,
  workspaceView,
  type WorkspaceAction,
  type WorkspaceState,
} from "./workspace-store"

export { ORGANIZATION_TYPES, environmentFor, emptyOrganization } from "./workspace-store"
export type {
  OrganizationProfile,
  ThemePreference,
  WorkspaceCommunity,
  WorkspaceStore,
} from "./workspace-store"

interface WorkspaceContextValue {
  /** The store with the active community's slice flattened onto it. */
  state: WorkspaceState
  dispatch: Dispatch<WorkspaceAction>
  enabledModules: Set<string>
  isLive: boolean
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [store, dispatch] = useReducer(workspaceReducer, undefined, loadWorkspaceStore)
  const state = useMemo(() => workspaceView(store), [store])

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const root = document.documentElement
    const apply = () => {
      const theme: ThemeName = state.theme === "system" ? (media.matches ? "dark" : "light") : state.theme
      root.dataset.theme = theme
      // Every token the accent derives is written together. Writing only `--blue` is what left an
      // orange workspace with a blue active nav item, blue tabs and blue eyebrows, because
      // `--blue-text` kept its hardcoded blue.
      const accent = resolveAccent(state.accent, theme)
      root.style.setProperty("--blue", accent.accent)
      root.style.setProperty("--blue-dark", accent.hover)
      root.style.setProperty("--blue-soft", accent.soft)
      root.style.setProperty("--blue-text", accent.text)
      root.style.setProperty("--on-accent", accent.on)
      root.dataset.accent = isCustomAccent(state.accent) ? "custom" : state.accent
      root.style.setProperty("--brand-secondary", state.organization.secondaryColor)
    }
    apply()
    media.addEventListener("change", apply)
    return () => media.removeEventListener("change", apply)
  }, [state.theme, state.accent, state.organization.secondaryColor])

  useEffect(() => {
    persistWorkspaceStore(store)
  }, [store])

  const value = useMemo(
    () => ({
      state,
      dispatch,
      enabledModules: new Set(state.enabledModules),
      isLive: state.environment === "live",
    }),
    [state],
  )

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}

// Provider and hook intentionally share one module so the context stays private.
// eslint-disable-next-line react-refresh/only-export-components
export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context)
    throw new Error("useWorkspace must be used within WorkspaceProvider.")
  return context
}
