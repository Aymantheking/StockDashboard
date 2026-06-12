import { Filter } from "lucide-react"

export function FilterButton({
  activeCount = 0,
  onClick,
}: {
  activeCount?: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded border border-gray-300 bg-white px-4 py-2 font-medium"
    >
      <Filter className="h-4 w-4" />
      Filters
      {activeCount > 0 && (
        <span className="rounded-full bg-yellow-400 px-2 py-0.5 text-xs font-bold">
          {activeCount}
        </span>
      )}
    </button>
  )
}
