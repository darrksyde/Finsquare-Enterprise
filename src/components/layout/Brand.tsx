import { Landmark } from "@/icons"

/**
 * Brand artwork is optional. Anything matching `src/assets/brand/logo*` is resolved at build time
 * and used here; with no artwork the built-in mark and wordmark are used, so the workspace always
 * renders. The file names are documented in `src/assets/brand/README.md`.
 */
const artwork = import.meta.glob("../../assets/brand/logo*.{svg,png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>

/** Looks up artwork by name rather than by exact path, so any supported extension works. */
function art(name: string): string | undefined {
  const key = Object.keys(artwork).find((path) => new RegExp(`/brand/${name}\\.[a-z0-9]+$`, "i").test(path))
  return key ? artwork[key] : undefined
}

const markLight = art("logo")
const markDark = art("logo-dark")
const lockupLight = art("logo-full")
const lockupDark = art("logo-full-dark")

/**
 * Renders both theme variants and lets CSS hide one, so nothing has to observe the theme. When the
 * dark artwork is missing, or is all there is, a single image is rendered instead.
 */
function Artwork({
  light,
  dark,
  className,
  size,
}: {
  light: string
  dark?: string
  className: string
  size?: number
}) {
  const style = size ? { width: size, height: size } : undefined
  if (dark && dark !== light) {
    return (
      <>
        <img className={`${className} brand-logo-light`} src={light} alt="FinSquare" style={style} />
        <img className={`${className} brand-logo-dark`} src={dark} alt="FinSquare" style={style} />
      </>
    )
  }
  return <img className={className} src={light} alt="FinSquare" style={style} />
}

function FallbackMark({ size }: { size: number }) {
  return (
    <div className="brand-mark" style={{ width: size, height: size }}>
      <Landmark size={Math.round(size * 0.57)} />
    </div>
  )
}

/**
 * The product mark on its own, with no wordmark — for the places where FinSquare itself is the
 * subject (the welcome card of the login page and the onboarding flow). A community's own logo is a
 * separate thing: the organisation uploads it and `OrgAvatar` renders it.
 */
export function BrandMark({ size = 30 }: { size?: number }) {
  const light = markLight ?? lockupLight
  const dark = markDark ?? lockupDark
  const source = light ?? dark
  if (!source) return <FallbackMark size={size} />
  return <Artwork light={source} dark={light ? dark : undefined} className="brand-mark-img" size={size} />
}

export function Brand() {
  const light = lockupLight ?? markLight
  const dark = lockupDark ?? markDark
  const source = light ?? dark
  const wordmark = !lockupLight && !lockupDark

  return (
    <div className="brand">
      {source ? (
        <Artwork light={source} dark={light ? dark : undefined} className="brand-logo" />
      ) : (
        <FallbackMark size={30} />
      )}
      {wordmark && (
        <div>
          <b>FinSquare</b>
          <small>ENTERPRISE</small>
        </div>
      )}
    </div>
  )
}

export default Brand
