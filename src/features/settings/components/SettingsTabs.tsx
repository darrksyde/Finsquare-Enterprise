import { SETTINGS_TABS, canAccessView, settingsTabFor } from "@/app/config/navigation"
import { Tabs } from "@/components/ui"
import type { Permission, View } from "@/types"

/** Settings is a single sidebar destination; its sections are tabs. */
export default function SettingsTabs({ view, navigate, enabled, can }: { view: View; navigate: (v: View) => void; enabled: ReadonlySet<string>; can: (p: Permission) => boolean }) {
  const tabs = SETTINGS_TABS.filter((t) => canAccessView(t.id, enabled, can))
  const active = settingsTabFor(view) ?? "settings"
  return (
    <div className="settings-tabs">
      <Tabs tabs={tabs} value={active} onChange={navigate} />
    </div>
  )
}
