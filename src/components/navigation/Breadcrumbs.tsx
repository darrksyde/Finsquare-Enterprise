import { breadcrumbTrail, crumbParent } from "@/app/config/navigation"
import { ArrowLeft, ChevronRight } from "@/icons"
import type { View } from "@/types"

export default function Breadcrumbs({ view, navigate }: { view: View; navigate: (v: View) => void }) {
  if (view === "overview") return null
  const trail = breadcrumbTrail(view)
  const parent = crumbParent(view)
  return (
    <div className="crumbs">
      {parent && (
        <button type="button" className="crumb-back" onClick={() => navigate(parent)}>
          <ArrowLeft size={14} />
          Back
        </button>
      )}
      <nav aria-label="Breadcrumb">
        <ol>
          {trail.map((c, i) => {
            const last = i === trail.length - 1
            return (
              <li key={c.view}>
                {last ? <span aria-current="page">{c.label}</span> : <button type="button" onClick={() => navigate(c.view)}>{c.label}</button>}
                {!last && <ChevronRight size={12} />}
              </li>
            )
          })}
        </ol>
      </nav>
    </div>
  )
}
