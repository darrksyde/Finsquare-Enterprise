import { describe, expect, it } from "vitest"
import {
  ACCENT_PRESETS,
  DEFAULT_ACCENT,
  contrastRatio,
  hexForAccent,
  isCustomAccent,
  readableOn,
  resolveAccent,
} from "./accent"
import type { ThemeName } from "./accent"

const THEMES: ThemeName[] = ["light", "dark"]

/** The most demanding surface accent text sits on, per theme (`--surface-soft`). */
const BACKDROP: Record<ThemeName, string> = { light: "#f8f9fb", dark: "#1b222c" }
const PAGE: Record<ThemeName, string> = { light: "#ffffff", dark: "#151a22" }

describe("contrastRatio", () => {
  it("is 21 for black on white and 1 for a colour on itself", () => {
    expect(Math.round(contrastRatio("#000000", "#ffffff"))).toBe(21)
    expect(contrastRatio("#2563eb", "#2563eb")).toBe(1)
  })

  it("is symmetric", () => {
    expect(contrastRatio("#2563eb", "#ffffff")).toBeCloseTo(contrastRatio("#ffffff", "#2563eb"), 10)
  })

  it("falls back to 1 rather than throwing on junk input", () => {
    expect(contrastRatio("not-a-colour", "#ffffff")).toBe(1)
  })
})

describe("readableOn", () => {
  it("picks white ink for a dark brand colour", () => {
    expect(readableOn("#2563eb")).toBe("#ffffff")
    expect(readableOn("#c2410c")).toBe("#ffffff")
  })

  it("picks dark ink for a light brand colour — the white-on-white case", () => {
    expect(readableOn("#ffffff")).toBe("#17202e")
    expect(readableOn("#fde68a")).toBe("#17202e")
  })

  it("always clears AA on the preset colours", () => {
    for (const preset of ACCENT_PRESETS) {
      expect(contrastRatio(preset.hex, readableOn(preset.hex))).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe("hexForAccent", () => {
  it("accepts a preset id, a lowercase hex and an uppercase hex", () => {
    expect(hexForAccent("orange")).toBe("#c2410c")
    expect(hexForAccent("#ff8800")).toBe("#ff8800")
    expect(hexForAccent("#FF8800")).toBe("#ff8800")
    expect(hexForAccent("#ff8800")).toBe(hexForAccent("#FF8800"))
  })

  it("falls back to the default rather than painting nothing", () => {
    expect(hexForAccent("chartreuse")).toBe(DEFAULT_ACCENT)
    expect(hexForAccent("#12345")).toBe(DEFAULT_ACCENT)
    expect(hexForAccent("")).toBe(DEFAULT_ACCENT)
  })

  it("separates a custom colour from a preset id", () => {
    expect(isCustomAccent("#2563eb")).toBe(true)
    expect(isCustomAccent("blue")).toBe(false)
  })
})

describe("resolveAccent", () => {
  it("leaves every preset exactly as chosen — the brand colour is not silently adjusted", () => {
    for (const preset of ACCENT_PRESETS) {
      for (const theme of THEMES) {
        expect(resolveAccent(preset.id, theme).accent).toBe(preset.hex)
      }
    }
  })

  it("gives text sitting on the accent AA contrast for every preset in both themes", () => {
    for (const preset of ACCENT_PRESETS) {
      for (const theme of THEMES) {
        const tokens = resolveAccent(preset.id, theme)
        expect(contrastRatio(tokens.on, tokens.accent)).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it("gives accent text on the page AA contrast for every preset in both themes", () => {
    for (const preset of ACCENT_PRESETS) {
      for (const theme of THEMES) {
        const tokens = resolveAccent(preset.id, theme)
        expect(contrastRatio(tokens.text, BACKDROP[theme])).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it("gives accent text AA contrast on the accent's own tint, for every preset in both themes", () => {
    // Badges and checked chips paint accent text on `--blue-soft`, which is a slightly darker
    // backdrop than the page. Checking only the page left them at 4.48.
    for (const preset of ACCENT_PRESETS) {
      for (const theme of THEMES) {
        const tokens = resolveAccent(preset.id, theme)
        expect(contrastRatio(tokens.text, tokens.soft)).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it("never makes the text the same colour as the fill, even for a white brand", () => {
    for (const theme of THEMES) {
      const tokens = resolveAccent("#ffffff", theme)
      expect(tokens.on).not.toBe(tokens.accent)
      expect(contrastRatio(tokens.on, tokens.accent)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it("guarantees both floors for awkward colours, where neither ink clears AA on the chosen fill", () => {
    const values = ["#ffffff", "#000000", "#808080", "#c0c0c0", "#404040", "#ffff00", "#fefefe", "#010101", "not-a-colour"]
    for (const value of values) {
      for (const theme of THEMES) {
        const tokens = resolveAccent(value, theme)
        expect(contrastRatio(tokens.on, tokens.accent), `${value} / ${theme} text on accent`).toBeGreaterThanOrEqual(4.5)
        expect(contrastRatio(tokens.accent, PAGE[theme]), `${value} / ${theme} fill against page`).toBeGreaterThanOrEqual(1.5)
      }
    }
  })

  it("moves a fill that would vanish into the page away from it", () => {
    const pale = resolveAccent("#fefefe", "light")
    expect(pale.accent).not.toBe("#fefefe")
    expect(contrastRatio(pale.accent, PAGE.light)).toBeGreaterThanOrEqual(1.5)
  })

  it("keeps a dark brand distinguishable on a dark page", () => {
    const tokens = resolveAccent("#101010", "dark")
    expect(contrastRatio(tokens.accent, PAGE.dark)).toBeGreaterThanOrEqual(1.5)
  })

  it("moves the hover shade away from the page in both themes", () => {
    const light = resolveAccent("orange", "light")
    expect(contrastRatio(light.hover, PAGE.light)).toBeGreaterThan(contrastRatio(light.accent, PAGE.light))
    const dark = resolveAccent("orange", "dark")
    expect(contrastRatio(dark.hover, PAGE.dark)).toBeGreaterThan(contrastRatio(dark.accent, PAGE.dark))
  })

  it("keeps the tint a tint, whatever the brand colour", () => {    const values = [...ACCENT_PRESETS.map((preset) => preset.hex as string), "#ffffff", "#fefefe", "#000000"]
    for (const value of values) {
      for (const theme of THEMES) {
        const tokens = resolveAccent(value, theme)
        expect(contrastRatio(tokens.soft, PAGE[theme])).toBeLessThan(1.6)
        expect(contrastRatio(tokens.soft, PAGE[theme])).toBeLessThan(contrastRatio(tokens.accent, PAGE[theme]) + 0.01)
      }
    }
  })

  it("keeps muted text legible on the tint, which a near-white accent in dark mode broke", () => {
    const MUTED: Record<ThemeName, string> = { light: "#5c6678", dark: "#a9b3c2" }
    for (const value of ["#ffffff", "#fefefe", ...ACCENT_PRESETS.map((preset) => preset.hex as string)]) {
      for (const theme of THEMES) {
        const tokens = resolveAccent(value, theme)
        expect(contrastRatio(MUTED[theme], tokens.soft)).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it("resolves every token to a real colour, for any input", () => {
    const values: string[] = ACCENT_PRESETS.map((preset) => preset.hex as string).concat(["blue", "#fff", "", "#000000", "#ffffff"])
    for (const value of values) {
      for (const theme of THEMES) {
        const tokens = resolveAccent(value, theme)
        for (const token of Object.values(tokens)) {
          expect(token).toMatch(/^#[0-9a-f]{6}$/)
        }
      }
    }
  })
})
