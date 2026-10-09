const esc = (v: string | number) => String(v).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string)

const PRINT_HEAD = "<!doctype html><title>"
const PRINT_STYLE = "<style>body{font:12px system-ui;margin:24px;color:#17202e}h1{font-size:16px}h2{font-size:13px;margin:18px 0 6px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #d6dce5;padding:5px 8px;text-align:left}th{background:#f3f5f8}.blank{height:26px;border-bottom:1px solid #d6dce5}</style>"

/** Opens a print-ready table; the user saves it as PDF. The backend will later render server-side PDFs. */
export function printTable(title: string, headers: string[], rows: (string | number)[][]) {
  const w = window.open("", "_blank")
  if (!w) return
  w.document.write(`${PRINT_HEAD}${esc(title)}</title>${PRINT_STYLE}<h1>${esc(title)}</h1><p>Generated ${new Date().toLocaleString()}</p><table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`)
  w.document.close()
  w.focus()
  w.print()
}

/**
 * Opens a print-ready document built from markup the caller supplies. Used to export a blank form
 * so it can be printed and filled in outside the platform; the online form stays the primary route.
 */
export function printDocument(title: string, bodyHtml: string) {
  const w = window.open("", "_blank")
  if (!w) return
  w.document.write(`${PRINT_HEAD}${esc(title)}</title>${PRINT_STYLE}<h1>${esc(title)}</h1>${bodyHtml}`)
  w.document.close()
  w.focus()
  w.print()
}
