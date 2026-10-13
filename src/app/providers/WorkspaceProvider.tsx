import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react"
import { emptyCorporateDetails, type AdminAccount, type CorporateAccountDetails } from "@/features/onboarding/types"
import type { Session } from "@/features/auth/types"
import { DEFAULT_ENABLED_MODULES } from "@/app/config/module-registry"
import { isCustomAccent, resolveAccent, type ThemeName } from "@/lib/theme/accent"
import { complianceDocumentsMock } from "@/features/compliance/mocks/compliance.mock"
import type {
  ComplianceDocumentStatus,
  CorporateAccountStatus,
  OrganizationEnvironment,
} from "@/types"

interface WorkspaceState {
  organizationCreated: boolean
  environment: OrganizationEnvironment
  enabledModules: string[]
  complianceDocuments: ComplianceDocumentStatus[]
  corporateAccountStatus: CorporateAccountStatus
  theme: ThemePreference
  accent: string
  organization: OrganizationProfile
  onboardingCompleted: boolean
  admin: AdminAccount
  corporateDetails: CorporateAccountDetails
  /** The signed-in administrator. Session-scoped on purpose: reloading the page signs you out. */
  session: Session | null
}

export type ThemePreference = "light" | "dark" | "system"

export interface OrganizationProfile {
  name: string
  type: string
  registrationNumber: string
  yearEstablished: string
  legalName: string
  country: string
  description: string
  memberCount: string
  areaOfOperation: string
  secondaryColor: string
  email: string
  phone: string
  website: string
  address: string
  city: string
  state: string
  logo: string
}

export const ORGANIZATION_TYPES = ["Cooperative", "Association", "Union", "MFI", "Staff association", "Farmers' group", "Other"]

const defaultOrganization: OrganizationProfile = {
  name: "Lagos Farmers Cooperative",
  type: "Cooperative",
  registrationNumber: "RC-1048223",
  yearEstablished: "2014",
  legalName: "Lagos Farmers Cooperative Society Ltd",
  country: "Nigeria",
  description: "",
  memberCount: "2438",
  areaOfOperation: "Agriculture",
  secondaryColor: "#0f766e",
  email: "info@lagosfarmers.coop",
  phone: "+234 801 234 5678",
  website: "",
  address: "12 Agric Road, Ikeja",
  city: "Lagos",
  state: "Lagos",
  logo: "",
}

function loadOrganization(): OrganizationProfile {
  try {
    const raw = window.localStorage.getItem("finsquare-org")
    return raw ? { ...defaultOrganization, ...JSON.parse(raw) } : defaultOrganization
  } catch {
    return defaultOrganization
  }
}

interface StoredOnboarding {
  completed: boolean
  admin: AdminAccount
  corporateDetails: CorporateAccountDetails
  corporateStatus: CorporateAccountStatus
}

const defaultOnboarding: StoredOnboarding = {
  completed: false,
  admin: { name: "", email: "", phone: "" },
  corporateDetails: emptyCorporateDetails,
  corporateStatus: "Not connected",
}

function loadOnboarding(): StoredOnboarding {
  try {
    const raw = window.localStorage.getItem("finsquare-onboarding")
    return raw ? { ...defaultOnboarding, ...JSON.parse(raw) } : defaultOnboarding
  } catch {
    return defaultOnboarding
  }
}

/** Corporate account status drives the workspace environment: no account yet means demo mode. */
export function environmentFor(status: CorporateAccountStatus): OrganizationEnvironment {
  return status === "Connected" ? "live" : status === "Under review" ? "pending_review" : "demo"
}

const stored = loadOnboarding()

type WorkspaceAction = {
  type: "organization/created"
  value: boolean
} | {
  type: "environment/changed"
  value: OrganizationEnvironment
} | {
  type: "modules/replaced"
  value: string[]
} | {
  type: "compliance/replaced"
  value: ComplianceDocumentStatus[]
} | {
  type: "compliance/document-updated"
  index: number
  value: ComplianceDocumentStatus
} | {
  type: "corporate-account/status-changed"
  value: CorporateAccountStatus
} | {
  type: "preferences/theme-changed"
  value: ThemePreference
} | {
  type: "onboarding/completed"
} | {
  type: "onboarding/restarted"
} | {
  type: "onboarding/admin-saved"
  value: AdminAccount
} | {
  type: "corporate-account/details-saved"
  value: CorporateAccountDetails
} | {
  type: "organization/updated"
  value: Partial<OrganizationProfile>
} | {
  type: "preferences/accent-changed"
  value: string
} | {
  type: "auth/signed-in"
  value: Session
} | {
  type: "auth/signed-out"
}

const initialState: WorkspaceState = {
  organizationCreated: true,
  environment: environmentFor(stored.corporateStatus),
  enabledModules: DEFAULT_ENABLED_MODULES,
  complianceDocuments: complianceDocumentsMock.map(
    (document) => document.status,
  ),
  corporateAccountStatus: stored.corporateStatus,
  onboardingCompleted: stored.completed,
  admin: stored.admin,
  corporateDetails: stored.corporateDetails,
  theme: ((v) => (v === "dark" || v === "system" ? v : v === "light" ? "light" : "system"))(
    window.localStorage.getItem("finsquare-theme"),
  ),
  organization: loadOrganization(),
  accent: window.localStorage.getItem("finsquare-accent") || "blue",
  session: null,
}

function workspaceReducer(
  state: WorkspaceState,
  action: WorkspaceAction,
): WorkspaceState {
  switch (action.type) {
    case "organization/created":
      return { ...state, organizationCreated: action.value }
    case "environment/changed":
      return { ...state, environment: action.value }
    case "modules/replaced":
      return { ...state, enabledModules: action.value }
    case "compliance/replaced":
      return { ...state, complianceDocuments: action.value }
    case "compliance/document-updated":
      return {
        ...state,
        complianceDocuments: state.complianceDocuments.map((document, index) =>
          index === action.index ? action.value : document,
        ),
      }
    case "corporate-account/status-changed":
      return { ...state, corporateAccountStatus: action.value, environment: environmentFor(action.value) }
    case "onboarding/completed":
      // Finishing sign-up signs the new administrator in.
      return {
        ...state,
        onboardingCompleted: true,
        session: state.session ?? {
          email: state.admin.email,
          name: state.admin.name,
          signedInAt: new Date().toISOString(),
        },
      }
    case "auth/signed-in":
      return { ...state, session: action.value }
    case "auth/signed-out":
      return { ...state, session: null }
    case "onboarding/restarted":
      return { ...state, onboardingCompleted: false }
    case "onboarding/admin-saved":
      return { ...state, admin: action.value }
    case "corporate-account/details-saved":
      return { ...state, corporateDetails: action.value }
    case "preferences/theme-changed":
      return { ...state, theme: action.value }
    case "organization/updated":
      return { ...state, organization: { ...state.organization, ...action.value } }
    case "preferences/accent-changed":
      return { ...state, accent: action.value }
  }
}

interface WorkspaceContextValue {
  state: WorkspaceState
  dispatch: Dispatch<WorkspaceAction>
  enabledModules: Set<string>
  isLive: boolean
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(workspaceReducer, initialState)

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
    window.localStorage.setItem("finsquare-theme", state.theme)
    window.localStorage.setItem("finsquare-accent", state.accent)
    return () => media.removeEventListener("change", apply)
  }, [state.theme, state.accent, state.organization.secondaryColor])

  useEffect(() => {
    try {
      window.localStorage.setItem("finsquare-onboarding", JSON.stringify({
        completed: state.onboardingCompleted,
        admin: state.admin,
        corporateDetails: state.corporateDetails,
        corporateStatus: state.corporateAccountStatus,
      }))
    } catch {
      // ignore storage failures
    }
  }, [state.onboardingCompleted, state.admin, state.corporateDetails, state.corporateAccountStatus])

  useEffect(() => {
    try {
      window.localStorage.setItem("finsquare-org", JSON.stringify(state.organization))
    } catch {
      // storage full (large logo) – keep in-memory only
    }
  }, [state.organization])

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
