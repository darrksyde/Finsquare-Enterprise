import type { ReactNode } from "react"
import { Search } from "@/icons"

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <label className="search">
      <span className="sr-only">Search</span>
      <Search size={15} />
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="table-toolbar management-filter-bar">{children}</div>
}

export function SummaryMetric({
  label,
  value,
  detail,
}: {
  label: string
  value: string | number
  detail?: string
}) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
      </div>
      <div className="stat-value">{value}</div>
      {detail && <div className="stat-sub">{detail}</div>}
    </div>
  )
}
