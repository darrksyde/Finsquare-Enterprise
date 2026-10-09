export interface TabItem<T extends string> {
  id: T
  label: string
  count?: number
}

/**
 * A single row of navigation for the level you are on. Module tabs belong to a
 * module index; a detail screen gets its own tabs and never both.
 */
export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: TabItem<T>[]; value: T; onChange: (id: T) => void }) {
  return (
    <div className="tabs">
      {tabs.map((tab) => (
        <button type="button" key={tab.id} className={tab.id === value ? "active" : ""} onClick={() => onChange(tab.id)}>
          {tab.label}
          {tab.count !== undefined ? ` (${tab.count})` : ""}
        </button>
      ))}
    </div>
  )
}
