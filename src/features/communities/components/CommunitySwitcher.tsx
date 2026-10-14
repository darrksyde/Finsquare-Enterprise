import { useEffect, useRef, useState } from "react"
import { Check, ChevronsUpDown, Plus } from "@/icons"
import { useWorkspace } from "@/app/providers/WorkspaceProvider"
import OrgAvatar from "@/components/layout/OrgAvatar"
import { initialsOf } from "@/lib/formatting/initials"
import type { View } from "@/types"

/**
 * The community switcher: every community the administrator belongs to, the role they hold in each,
 * and the way to start another one.
 *
 * Switching changes the tenant the whole workspace works in — the data a page loads, the modules it
 * offers and the permissions it checks all follow the community that is active.
 */
export default function CommunitySwitcher({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { state, dispatch } = useWorkspace()
  const { communities, activeCommunityId } = state
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  const active = communities.find((community) => community.id === activeCommunityId) ?? communities[0]

  return (
    <div className="org-switcher-wrap" ref={root}>
      <button
        type="button"
        className="org-switcher"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Switch community. Currently ${active?.organization.name ?? "no community"} as ${active?.roleName ?? "unknown role"}`}
        onClick={() => setOpen((value) => !value)}
      >
        <OrgAvatar />
        <div className="org-switcher-copy">
          <b>{active?.organization.name || "No community"}</b>
          <small>{active?.roleName ?? "Administrator"}</small>
        </div>
        <ChevronsUpDown size={14} />
      </button>

      {open && (
        <div className="org-menu" role="menu" aria-label="Your communities">
          <div className="org-menu-head">
            <b>Your communities</b>
            <span>
              {communities.length} {communities.length === 1 ? "community" : "communities"}
            </span>
          </div>
          {communities.map((community) => {
            const isActive = community.id === state.activeCommunityId
            return (
              <button
                key={community.id}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                className="org-menu-item"
                onClick={() => {
                  setOpen(false)
                  if (isActive) return
                  dispatch({ type: "communities/activated", value: community.id })
                  // A page inside the previous community is not a page inside this one.
                  onNavigate("overview")
                }}
              >
                <span className="org-menu-avatar" aria-hidden="true">
                  {community.organization.logo ? (
                    <img src={community.organization.logo} alt="" />
                  ) : (
                    initialsOf(community.organization.name)
                  )}
                </span>
                <span className="org-menu-copy">
                  <b>{community.organization.name || "Untitled community"}</b>
                  <small>
                    {community.organization.type || "Community"} · {community.roleName}
                  </small>
                </span>
                {isActive && <Check size={15} />}
              </button>
            )
          })}
          <button
            type="button"
            role="menuitem"
            className="org-menu-item org-menu-add"
            onClick={() => {
              setOpen(false)
              onNavigate("community-create")
            }}
          >
            <span className="org-menu-avatar" aria-hidden="true">
              <Plus size={15} />
            </span>
            <span className="org-menu-copy">
              <b>Create a community</b>
              <small>Same administrator account, everything else from scratch</small>
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
