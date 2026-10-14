/**
 * The two-letter mark used wherever a name has no logo: a community in the switcher, an
 * administrator in the sidebar, a brand preview.
 *
 * `Lagos Farmers Cooperative` → `LF`. A single-word name still yields two letters, because one
 * letter reads as a typo rather than as an abbreviation.
 */
export function initialsOf(name: string): string {
  const words = name.split(/\s+/).filter(Boolean)
  if (!words.length) return ""
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
}
