import type { ReactNode } from "react"
import { Button } from "@/components/ui"

export interface DataTableColumn<T> {
  id: string
  header: string
  render: (row: T) => ReactNode
  className?: string
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  page,
  pageSize,
  total,
  onPageChange,
  empty,
  selectedKeys,
  onSelectionChange,
}: {
  rows: T[]
  columns: DataTableColumn<T>[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  empty: ReactNode
  selectedKeys?: ReadonlySet<string>
  onSelectionChange?: (keys: Set<string>) => void
}) {
  if (rows.length === 0) return <>{empty}</>
  const first = (page - 1) * pageSize + 1
  const last = Math.min(total, page * pageSize)

  return (
    <>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {selectedKeys && onSelectionChange && (
                <th className="selection-cell">
                  <input
                    type="checkbox"
                    aria-label="Select all visible rows"
                    checked={rows.every((row) => selectedKeys.has(rowKey(row)))}
                    onChange={(event) => {
                      const next = new Set(selectedKeys)
                      rows.forEach((row) => {
                        const key = rowKey(row)
                        if (event.target.checked) next.add(key)
                        else next.delete(key)
                      })
                      onSelectionChange(next)
                    }}
                  />
                </th>
              )}
              {columns.map((column) => (
                <th key={column.id} className={column.className}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={() => onRowClick?.(row)}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={(event) => {
                  if (
                    onRowClick &&
                    (event.key === "Enter" || event.key === " ")
                  ) {
                    event.preventDefault()
                    onRowClick(row)
                  }
                }}
              >
                {selectedKeys && onSelectionChange && (
                  <td
                    className="selection-cell"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      aria-label={`Select row ${rowKey(row)}`}
                      checked={selectedKeys.has(rowKey(row))}
                      onChange={(event) => {
                        const next = new Set(selectedKeys)
                        const key = rowKey(row)
                        if (event.target.checked) next.add(key)
                        else next.delete(key)
                        onSelectionChange(next)
                      }}
                    />
                  </td>
                )}
                {columns.map((column) => (
                  <td key={column.id} className={column.className}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-footer">
        <span>
          Showing {first}–{last} of {total}
        </span>
        <div>
          <Button
            variant="ghost"
            disabled={page === 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            disabled={last >= total}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </>
  )
}
