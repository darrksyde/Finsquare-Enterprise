import { describe, expect, it } from "vitest"
import { canAccessView, navigationSections } from "./navigation"
import { DEFAULT_ENABLED_MODULES } from "./module-registry"
import type { Permission } from "@/types"

const group = (id: string) => navigationSections.find((section) => section.id === id)
const item = (view: string) =>
  navigationSections.flatMap((section) => section.items).find((entry) => entry.id === view)

describe("the Communications section", () => {
  it("is labelled Communications and holds Messaging", () => {
    const section = group("communications")
    expect(section?.label).toBe("Communications")
    expect(section?.items.map((entry) => entry.label)).toContain("Messaging")
  })

  it("points Messaging at the `communication` view and module", () => {
    // The module id must stay `communication` — enabledModules is persisted in localStorage, so a
    // renamed id would silently disable the module for anyone with saved state.
    expect(item("communication")?.module).toBe("communication")
    expect(DEFAULT_ENABLED_MODULES).toContain("communication")
  })

  it("requires the view permission as well as the module", () => {
    expect(item("communication")?.permission).toBe("communication.view")
  })
})

describe("canAccessView for Messaging", () => {
  const enabled = new Set<string>(["communication"])
  const allow = () => true
  const deny = () => false

  it("is reachable when the module is on and the permission is held", () => {
    expect(canAccessView("communication", enabled, allow)).toBe(true)
  })

  it("is hidden when the module is off, however many permissions the administrator has", () => {
    expect(canAccessView("communication", new Set(["members", "wallet"]), allow)).toBe(false)
  })

  it("is hidden when the permission is missing, even with the module on", () => {
    expect(canAccessView("communication", enabled, deny)).toBe(false)
  })

  it("only asks for a permission the catalog knows about", () => {
    const permission = item("communication")?.permission as Permission
    expect(permission).toBe("communication.view")
  })
})
