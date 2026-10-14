import { useWorkspace } from "@/app/providers/WorkspaceProvider"
import { initialsOf } from "@/lib/formatting/initials"

/**
 * A community's uploaded logo, or its initials when it has none. Never the product mark.
 *
 * `name` and `logo` may be passed in to render a community that is not the active one — the
 * switcher lists several, and the create form previews one that does not exist yet.
 */
export default function OrgAvatar({
  large = false,
  name,
  logo,
}: {
  large?: boolean
  name?: string
  logo?: string
}) {
  const active = useWorkspace().state.organization
  const shownName = name ?? active.name
  const shownLogo = logo ?? active.logo
  return (
    <div className={`org-avatar${large ? " large" : ""}`}>
      {shownLogo ? <img src={shownLogo} alt={`${shownName} logo`} /> : initialsOf(shownName)}
    </div>
  )
}
