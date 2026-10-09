import { describe, expect, it } from "vitest"
import { customStep, doc, newVersion, qf } from "@/features/forms/domain/forms"
import { formExportHtml } from "./form-export"
import { memberSystemSteps } from "./member-application.rules"

const version = newVersion(1, "Draft", memberSystemSteps({
  custom: [customStep("About you", [qf("Occupation", "short_text"), qf("Crop type", "dropdown", true, ["Rice", "Maize"])])],
  docs: [doc("National ID", true, "A clear copy.")],
}))

describe("exporting a form for printing", () => {
  it("lists every step an applicant has to answer", () => {
    const html = formExportHtml(version)
    expect(html).toContain("Your details")
    expect(html).toContain("About you")
    expect(html).toContain("Documents")
  })

  it("leaves the review step out because there is nothing to answer on it", () => {
    expect(formExportHtml(version)).not.toContain("Review &amp; Submit")
  })

  it("marks required questions and gives each one a line to write on", () => {
    const html = formExportHtml(version)
    expect(html).toContain("Full name *")
    expect(html).toContain("<div class=\"blank\"></div>")
  })

  it("prints the answer choices and the document rules", () => {
    const html = formExportHtml(version)
    expect(html).toContain("one of: Rice, Maize")
    expect(html).toContain("Upload: PDF, JPG, PNG, max 5 MB")
    expect(html).toContain("A clear copy.")
  })

  it("escapes anything the organization typed", () => {
    const risky = newVersion(1, "Draft", memberSystemSteps({ custom: [customStep("A & B", [qf("<script>alert(1)</script>", "short_text")])] }))
    const html = formExportHtml(risky)
    expect(html).not.toContain("<script>")
    expect(html).toContain("&lt;script&gt;")
    expect(html).toContain("A &amp; B")
  })
})
