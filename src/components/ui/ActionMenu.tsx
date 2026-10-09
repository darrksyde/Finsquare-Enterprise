import { useEffect, useRef, useState } from "react"
import { MoreHorizontal, type IconType } from "@/icons"

export interface ActionMenuItem {
  label: string
  onSelect: () => void
  danger?: boolean
  disabled?: boolean
}

/**
 * One control for a group of actions on a record, instead of a row of buttons
 * that are always on screen. Closes on Escape, on selection and on an outside click.
 */
export function ActionMenu({
  label,
  icon: Icon = MoreHorizontal,
  variant = "secondary",
  items,
}: {
  label: string
  icon?: IconType
  variant?: "primary" | "secondary" | "ghost"
  items: ActionMenuItem[]
}) {
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

  if (items.length === 0) return null

  return (
    <div className="action-menu" ref={root}>
      <button
        type="button"
        className={`btn btn-${variant}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon size={15} />
        {label}
      </button>
      {open && (
        <div className="action-menu-list" role="menu">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className="action-menu-item"
              data-danger={item.danger ? "true" : undefined}
              disabled={item.disabled}
              onClick={() => {
                setOpen(false)
                item.onSelect()
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
