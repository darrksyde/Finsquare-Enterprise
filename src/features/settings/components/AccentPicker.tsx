import { useEffect, useState } from "react"
import { Check } from "@/icons"
import { ACCENT_PRESETS, DEFAULT_ACCENT, isCustomAccent, readableOn } from "@/lib/theme/accent"

/**
 * The preset swatches paint from `ACCENT_PRESETS`, not from CSS classes, so the colour an
 * administrator clicks is the same value the resolver derives every token from. Two copies of the
 * same hex is how a swatch and the workspace it produced drift apart.
 */
export default function AccentPicker({ accent, setAccent, onPreset }: { accent: string; setAccent: (value: string) => void; onPreset?: (label: string) => void }) {
  const isCustom = isCustomAccent(accent)
  const [hexDraft, setHexDraft] = useState(isCustom ? accent : "")
  useEffect(() => {
    if (isCustom) setHexDraft(accent)
  }, [accent, isCustom])
  return (
            <div className="accent-picker">
              <div className="accent-presets" role="group" aria-label="Example colors">
                {ACCENT_PRESETS.map((option) => (
                  <button
                    type="button"
                    key={option.id}
                    title={option.label}
                    aria-label={option.label}
                    aria-pressed={accent === option.id}
                    className={`accent-chip${accent === option.id ? " active" : ""}`}
                    style={{ background: option.hex, color: readableOn(option.hex) }}
                    onClick={() => {
                      setAccent(option.id)
                      onPreset?.(option.label)
                    }}
                  >
                    {accent === option.id && <Check size={14} />}
                  </button>
                ))}
              </div>
              <div className="accent-custom">
                <label className={`color-wheel${isCustom ? " active" : ""}`} title="Pick a custom color">
                  <input
                    type="color"
                    aria-label="Custom color wheel"
                    value={isCustom ? accent : DEFAULT_ACCENT}
                    onChange={(event) => setAccent(event.target.value)}
                  />
                </label>
                <div>
                  <b>Custom color</b>
                  <span>Open the color wheel or enter a hex value</span>
                </div>
                <input
                  className="hex-input"
                  aria-label="Hex color"
                  maxLength={7}
                  value={hexDraft}
                  onChange={(event) => {
                    const value = event.target.value
                    setHexDraft(value)
                    if (/^#[0-9a-fA-F]{6}$/.test(value)) setAccent(value.toLowerCase())
                  }}
                  placeholder="#2563EB"
                />
              </div>
            </div>
  )
}
