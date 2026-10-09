import { useWorkspace } from "@/app/providers/WorkspaceProvider"

export default function OrgAvatar({ large = false }: { large?: boolean }) {
  const { name, logo } = useWorkspace().state.organization
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase()
  return (
    <div className={`org-avatar${large ? " large" : ""}`}>
      {logo ? <img src={logo} alt={`${name} logo`} /> : initials}
    </div>
  )
}
