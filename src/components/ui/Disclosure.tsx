import { useState, type ReactNode } from "react"
import { ChevronRight } from "@/icons"

/**
 * Advanced detail that is available but not in the way.
 *
 * Screens show what an administrator needs to decide first; references, fees,
 * schedules and payout maths sit behind one of these. `plain` drops the divider
 * for use inside a panel or a table row.
 */
export function Disclosure({
  label,
  children,
  defaultOpen = false,
  plain = false,
}: {
  label: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  plain?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={plain ? "disclosure disclosure-plain" : "disclosure"}>
      <button
        type="button"
        className="disclosure-summary"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <ChevronRight size={14} />
        <span>{label}</span>
      </button>
      {open && <div className="disclosure-body">{children}</div>}
    </div>
  )
}
