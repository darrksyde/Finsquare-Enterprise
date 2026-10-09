import type { FormVersion } from "@/features/forms/types/form.types"

const esc = (v: string) => v.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string)

/**
 * The blank form as markup, so an administrator can print it (or save it as a PDF) and use it
 * outside the platform. Answers are written on the printed lines; the online form stays the
 * primary route. The review step is dropped because there is nothing to answer on it.
 */
export function formExportHtml(version: FormVersion): string {
  return version.steps
    .filter((step) => step.kind !== "review")
    .map((step) => {
      const fields = step.fields
        .map((field) => {
          const label = `${esc(field.label)}${field.required ? " *" : ""}`
          const detail = field.description ?? field.documentConfig?.description
          const hint = detail ? ` <i>${esc(detail)}</i>` : ""
          const options = field.options?.length ? ` <i>(one of: ${field.options.map((option) => esc(option.label)).join(", ")})</i>` : ""
          const file = field.documentConfig ? ` <i>Upload: ${field.documentConfig.fileTypes.join(", ")}, max ${field.documentConfig.maxSizeMb} MB</i>` : ""
          return `<div><b>${label}</b>${hint}${options}${file}<div class="blank"></div></div>`
        })
        .join("")
      return `<h2>${esc(step.title)}</h2>${step.description ? `<p>${esc(step.description)}</p>` : ""}${fields || "<p><i>Nothing to answer on this step.</i></p>"}`
    })
    .join("")
}
