import { BrowserRouter } from "react-router-dom"
import FinSquareApp from "./app/app"
import { WorkspaceProvider } from "./app/providers/WorkspaceProvider"

// Published builds are served from a sub-path; derive the router basename from Vite's base.
const basePath = new URL(import.meta.env.BASE_URL, window.location.origin).pathname.replace(/\/+$/, "")
const basename = basePath && window.location.pathname.startsWith(basePath) ? basePath : ""

export default function App() {
  return (
    <BrowserRouter basename={basename}>
      <WorkspaceProvider>
        <FinSquareApp />
      </WorkspaceProvider>
    </BrowserRouter>
  )
}
