import type { ReactNode } from "react"
import { SectionHeader, Tabs, type TabItem } from "@/components/ui"
import { AttentionStrip, type AttentionItem } from "@/components/feedback/AttentionStrip"

interface ShellPageBase {
  title: string
  description?: string
  /** Chips describing the record, rendered inside the header. */
  meta?: ReactNode
  actions?: ReactNode
  /**
   * `narrow` centres the page in a 720px column, for a focused creator form.
   * Left unset for a dashboard, a report or a table, which need the full width.
   */
  width?: "narrow"
  children: ReactNode
}

/**
 * The page contract for a module screen.
 *
 * `index` pages are a module front door: they may show the module's tab row and
 * an attention strip. `detail` pages own a single record, so they get its own
 * tabs (rendered by the page) and never the module's — that is how the app used
 * to end up with two tab bars and two headers on one screen.
 */
export type ShellPageProps<T extends string> = ShellPageBase &
  (
    | {
        level?: "index"
        tabs?: TabItem<T>[]
        activeTab?: T
        onTabChange?: (id: T) => void
        attention?: AttentionItem[]
      }
    | {
        level: "detail"
        tabs?: never
        activeTab?: never
        onTabChange?: never
        attention?: never
      }
  )

export function ShellPage<T extends string>({
  title,
  description,
  meta,
  actions,
  width,
  children,
  ...rest
}: ShellPageProps<T>) {
  const index = rest.level !== "detail" ? rest : undefined
  const showTabs = index?.tabs && index.tabs.length > 0 && index.onTabChange

  return (
    <div className={width === "narrow" ? "page page-narrow" : "page"}>
      <SectionHeader title={title} description={description} meta={meta} actions={actions} />
      {showTabs && index && <Tabs tabs={index.tabs as TabItem<T>[]} value={index.activeTab as T} onChange={index.onTabChange as (id: T) => void} />}
      {index?.attention && <AttentionStrip items={index.attention} />}
      {children}
    </div>
  )
}
