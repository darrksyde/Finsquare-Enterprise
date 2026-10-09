import { CircleHelp } from "@/icons"

export interface AttentionItem {
  /** Stable key — the same record can legitimately raise more than one item. */
  id: string
  label: string
  detail?: string
  onSelect?: () => void
  tone?: "amber" | "red" | "blue"
}

/**
 * The module front door's "what needs me" row: counts of things waiting on an
 * administrator, each one a link into the record that owns the work. Renders
 * nothing when there is nothing to do, so a calm module stays calm.
 */
export function AttentionStrip({ items, className = "" }: { items: AttentionItem[]; className?: string }) {
  if (items.length === 0) return null
  return (
    <section className={`attention ${className}`} aria-label="Needs attention">
      <span className="attention-lead">
        <CircleHelp size={15} />
        Needs attention
      </span>
      <div className="attention-items">
        {items.map((item) =>
          item.onSelect ? (
            <button key={item.id} type="button" className="attention-item" data-tone={item.tone ?? "amber"} onClick={item.onSelect}>
              <b>{item.label}</b>
              {item.detail}
            </button>
          ) : (
            <span key={item.id} className="attention-item" data-tone={item.tone ?? "amber"}>
              <b>{item.label}</b>
              {item.detail}
            </span>
          ),
        )}
      </div>
    </section>
  )
}
