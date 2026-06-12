import { Bookmark, ChevronsDown, ChevronsUp, Equal } from "lucide-react"
import type { PurchasePriority } from "../../features/purchases/purchasesTypes"

export function PriorityBadge({
  priority,
  showLabel = false,
}: {
  priority: PurchasePriority
  showLabel?: boolean
}) {
  const config = {
    Low: {
      icon: ChevronsDown,
      classes: "border-blue-200 bg-blue-50 text-blue-700",
    },
    Medium: {
      icon: Equal,
      classes: "border-yellow-300 bg-yellow-50 text-yellow-700",
    },
    High: {
      icon: ChevronsUp,
      classes: "border-orange-300 bg-orange-50 text-orange-700",
    },
    Critical: {
      icon: Bookmark,
      classes: "border-red-300 bg-red-50 text-red-700",
    },
  }[priority]
  const PriorityIcon = config.icon

  return (
    <span
      className={`inline-flex items-center justify-center gap-1.5 rounded border px-2 py-1 font-semibold ${config.classes}`}
      title={priority}
      aria-label={`${priority} priority`}
    >
      <PriorityIcon
        className="h-4 w-4"
        fill={priority === "Critical" ? "currentColor" : "none"}
      />
      {showLabel && <span className="text-sm">{priority}</span>}
    </span>
  )
}
