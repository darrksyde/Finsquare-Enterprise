import { useState } from "react"
import {
  Bell,
  ChevronDown,
  ChevronsUpDown,
  Landmark,
  MoreHorizontal,
  PanelLeftClose,
} from "@/icons"
import { navigationSections, parentView } from "@/app/config/navigation"
import type { View } from "@/types"
import type { Permission } from "@/types"
import { IconButton } from "@/components/ui"
import OrgAvatar from "@/components/layout/OrgAvatar"
import { useWorkspace } from "@/app/providers/WorkspaceProvider"

export function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark">
        <Landmark size={17} />
      </div>
      <div>
        <b>FinSquare</b>
        <small>ENTERPRISE</small>
      </div>
    </div>
  )
}

export function Sidebar({
  view,
  setView,
  enabled,
  open,
  close,
  can,
}: {
  view: View
  setView: (v: View) => void
  enabled: Set<string>
  open: boolean
  close: () => void
  can: (permission: Permission) => boolean
}) {
  const activeView = parentView(view)
  const { organization: org, admin } = useWorkspace().state
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())
  return (
    <>
      <button
        type="button"
        className={`sidebar-scrim ${open ? "show" : ""}`}
        aria-label="Close menu"
        onClick={close}
      />
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-head">
          <Brand />
          <IconButton
            icon={PanelLeftClose}
            label="Close sidebar"
            onClick={close}
          />
        </div>
        <button type="button" className="org-switcher" onClick={() => { setView("organization"); close() }}>
          <OrgAvatar />
          <div>
            <b>{org.name}</b>
            <small>{org.type}</small>
          </div>
          <ChevronsUpDown size={14} />
        </button>
        <nav className="nav">
          {navigationSections.map((section) => {
            const visible = section.items.filter(
              (item) =>
                (!item.module || enabled.has(item.module)) &&
                (!item.permission || can(item.permission)),
            )
            if (!visible.length) return null
            const renderItem = (item: (typeof visible)[number], nested = false) => {
              const Icon = item.icon
              return (
                <button
                  type="button"
                  key={item.id}
                  className={`${activeView === item.id ? "active" : ""} ${nested ? "nested" : ""}`}
                  onClick={() => {
                    setView(item.id as View)
                    close()
                  }}
                >
                  {!nested && <Icon size={16} />}
                  <span>{item.label}</span>
                </button>
              )
            }
            if (!section.label) {
              return <div className="nav-section" key={section.id}>{visible.map((item) => renderItem(item))}</div>
            }
            const hasActive = visible.some((item) => item.id === activeView)
            const expanded = hasActive || openIds.has(section.id)
            const Icon = section.icon
            return (
              <div className="nav-section nav-group" key={section.id} data-open={expanded}>
                <button
                  type="button"
                  className={`nav-group-head ${hasActive ? "has-active" : ""}`}
                  aria-expanded={expanded}
                  onClick={() => setOpenIds((prev) => {
                    const next = new Set(prev)
                    if (next.has(section.id)) next.delete(section.id)
                    else next.add(section.id)
                    return next
                  })}
                >
                  {Icon && <Icon size={16} />}
                  <span>{section.label}</span>
                  <ChevronDown size={14} className="nav-chevron" />
                </button>
                {expanded && <div className="nav-group-items">{visible.map((item) => renderItem(item, true))}</div>}
              </div>
            )
          })}
        </nav>
        <div className="sidebar-bottom">
          <button type="button">
            <Bell size={16} />
            Notifications<i>3</i>
          </button>
          <div className="admin">
            <div className="avatar">{(admin.name || "Admin User").split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}</div>
            <div>
              <b>{admin.name || "Admin User"}</b>
              <small>Super Admin</small>
            </div>
            <MoreHorizontal size={16} />
          </div>
        </div>
      </aside>
    </>
  )
}
