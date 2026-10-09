import { useLocation, useNavigate } from "react-router-dom"
import { buildViewPath, resolveView } from "@/app/config/routes"
import type { View } from "@/types"

export function useAppRoute() {
  const location = useLocation()
  const routerNavigate = useNavigate()
  const view = resolveView(location.pathname)

  const navigate = (next: View, id?: string) => {
    routerNavigate(buildViewPath(next, id))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const entityId = location.pathname.split("/").filter(Boolean).at(-1)

  return { view, entityId, navigate }
}
