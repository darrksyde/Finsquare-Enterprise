/**
 * The accent is one colour, but the app paints with five tokens derived from it. Resolving them in
 * one place is what keeps a workspace consistent: `--blue` followed the brand while `--blue-text`
 * stayed hardcoded blue, so an orange workspace still had a blue active nav item, blue tabs and
 * blue eyebrows.
 *
 * The resolution is contrast-aware, because a brand colour is a hue and not a promise. A white or
 * mid-grey accent paints white-on-white buttons and invisible active items, so the foreground for
 * text sitting *on* the accent, and the variant used as text *on the page*, are both computed
 * against the surface they actually sit on rather than assumed.
 *
 * Everything here is pure, so it is unit-tested rather than eyeballed.
 */

export type ThemeName = "light" | "dark"

export interface AccentTokens {
  /** Fill for buttons, progress, active borders. */
  accent: string
  /** The accent's hover shade: darker on a light surface, lighter on a dark one. */
  hover: string
  /** A tint of the accent, used as a background behind accent text. */
  soft: string
  /** The accent used as *text* on the page; always clears AA against it. */
  text: string
  /** Foreground for text and icons sitting *on* `accent`; never the same colour as it. */
  on: string
}

export const ACCENT_PRESETS = [
  { id: "blue", label: "FinSquare blue", hex: "#2563eb" },
  { id: "indigo", label: "Indigo", hex: "#4f46e5" },
  { id: "violet", label: "Violet", hex: "#7c3aed" },
  { id: "teal", label: "Teal", hex: "#0f766e" },
  { id: "orange", label: "Orange", hex: "#c2410c" },
] as const

export type AccentPresetId = (typeof ACCENT_PRESETS)[number]["id"]

export const DEFAULT_ACCENT = ACCENT_PRESETS[0].hex

/**
 * The background accent text sits on. `--surface-soft` rather than `--surface` because active nav
 * items, badges and chips all paint on the softer surface, so clearing AA against it clears both.
 */
const TEXT_BACKDROP: Record<ThemeName, string> = { light: "#f8f9fb", dark: "#1b222c" }

/** The two candidate foregrounds for a filled accent control. */
const FOREGROUNDS = { white: "#ffffff", ink: "#17202e" } as const

/** WCAG AA for body copy. */
const AA = 4.5

/** A filled control must not be the same colour as the page behind it. */
const MIN_FILL_CONTRAST = 1.5

/** How much of the accent a tint keeps, and how far a hover shade moves. */
const SOFT_KEEP: Record<ThemeName, number> = { light: 0.1, dark: 0.2 }
const HOVER_STEP = 0.14
const NUDGE = 0.08

/** The page background a fill or a tint is measured against. */
const PAGE: Record<ThemeName, string> = { light: "#ffffff", dark: "#151a22" }

/** A tint must stay a tint: visible against the page, but never a block of its own colour. */
const MAX_TINT_CONTRAST = 1.6

type Rgb = [number, number, number]

function parseHex(value: string): Rgb | null {
  const match = /^#?([\da-f]{6})$/i.exec(value.trim())
  if (!match) return null
  const int = parseInt(match[1], 16)
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255]
}

const toHex = (rgb: Rgb) =>
  `#${rgb.map((channel) => Math.round(Math.min(255, Math.max(0, channel))).toString(16).padStart(2, "0")).join("")}`

function relativeLuminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((channel) => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio, from 1 (identical) to 21 (black on white). */
export function contrastRatio(a: string, b: string): number {
  const first = parseHex(a)
  const second = parseHex(b)
  if (!first || !second) return 1
  const [high, low] = [relativeLuminance(first), relativeLuminance(second)].sort((x, y) => y - x)
  return (high + 0.05) / (low + 0.05)
}

/** `weight` is how much of `to` the result contains: 0 returns `from`, 1 returns `to`. */
function mix(from: string, to: string, weight: number): string {
  const a = parseHex(from)
  const b = parseHex(to)
  if (!a || !b) return from
  const t = Math.min(1, Math.max(0, weight))
  return toHex([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t])
}

/**
 * Whichever ink reads better on `background` — never the colour of the background itself, which is
 * how a white brand colour used to produce white writing on a white button.
 */
export function readableOn(background: string): string {
  const white = contrastRatio(background, FOREGROUNDS.white)
  const ink = contrastRatio(background, FOREGROUNDS.ink)
  return ink > white ? FOREGROUNDS.ink : FOREGROUNDS.white
}

/** Resolves a preset id or a hex into a usable hex, falling back to the default accent. */
export function hexForAccent(value: string): string {
  if (parseHex(value)) return value.trim().toLowerCase()
  return ACCENT_PRESETS.find((preset) => preset.id === value)?.hex ?? DEFAULT_ACCENT
}

/** True for a colour the administrator picked themselves rather than a preset id. */
export const isCustomAccent = (value: string) => value.startsWith("#")

/** Moves `from` toward `to` until it clears `minimum` against every background. Bounded, so it ends. */
function resolveUntil(from: string, toward: string, against: string[], minimum: number): string {
  let current = from
  for (let step = 0; step < 24 && against.some((background) => contrastRatio(current, background) < minimum); step += 1) {
    current = mix(current, toward, NUDGE)
  }
  return current
}

/**
 * The accent as a background tint.
 *
 * A near-white brand colour tints a dark surface into a light grey, which then fails as a
 * background for everything painted on it — `--muted` on `--blue-soft` measured 4.34 and the whole
 * badge and chip family degrades. So the tint is pulled back toward the surface until it is a tint
 * again rather than a colour in its own right.
 */
function resolveSoft(accent: string, theme: ThemeName): string {
  const surface = PAGE[theme]
  let current = mix(accent, surface, 1 - SOFT_KEEP[theme])
  for (let step = 0; step < 24 && contrastRatio(current, surface) > MAX_TINT_CONTRAST; step += 1) {
    current = mix(current, surface, 0.25)
  }
  return current
}

/**
 * Every token the workspace needs, for one accent and one resolved theme.
 *
 * Two guarantees are applied together, because they can pull in opposite directions: the fill stays
 * visible against the page, and text sitting on it clears AA. A brand colour is honoured exactly
 * unless one of those would fail — a mid-grey is the clearest case, where neither white nor black
 * clears 4.5 on it and the fill has to move a shade.
 */
export function resolveAccent(value: string, theme: ThemeName): AccentTokens {
  const page = PAGE[theme]
  const backdrop = TEXT_BACKDROP[theme]
  const awayFromPage = theme === "light" ? "#000000" : "#ffffff"

  let accent = hexForAccent(value)

  for (let round = 0; round < 4; round += 1) {
    accent = resolveUntil(accent, awayFromPage, [page], MIN_FILL_CONTRAST)
    const candidate = readableOn(accent)
    // Increase the fill/foreground contrast by moving the fill away from the foreground.
    const legible = resolveUntil(accent, candidate === FOREGROUNDS.white ? "#000000" : "#ffffff", [candidate], AA)
    if (legible === accent) break
    accent = legible
  }

  const soft = resolveSoft(accent, theme)

  return {
    accent,
    hover: mix(accent, theme === "light" ? "#000000" : "#ffffff", HOVER_STEP),
    soft,
    // Against the tint as well as the page: badges and checked chips paint accent text on the
    // accent's own tint, which is a slightly darker backdrop than the page itself.
    text: resolveUntil(accent, theme === "light" ? "#000000" : "#ffffff", [backdrop, soft], AA),
    on: readableOn(accent),
  }
}
