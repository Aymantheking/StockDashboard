import type { ReactNode } from "react"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"

export function Sidebar({
  collapsed,
  onToggle,
  children,
}: {
  collapsed: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <aside
      className={`sticky top-20 h-[calc(100vh-5rem)] shrink-0 overflow-y-auto bg-gray-900 text-white transition-[width] duration-300 ${
        collapsed ? "w-20 p-3" : "w-64 p-4"
      }`}
    >
      <div
        className={`mb-4 flex ${collapsed ? "justify-center" : "justify-end"}`}
      >
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex h-10 w-10 items-center justify-center rounded border border-gray-700 text-gray-300 transition hover:border-yellow-400 hover:bg-gray-800 hover:text-yellow-400"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-5 w-5" />
          ) : (
            <PanelLeftClose className="h-5 w-5" />
          )}
        </button>
      </div>
      {children}
    </aside>
  )
}
