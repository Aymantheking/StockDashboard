import type { ReactNode } from "react"

export function BulkActionBar({
  count,
  children,
}: {
  count: number
  children?: ReactNode
}) {
  if (count === 0) {
    return null
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3">
      <span className="mr-auto font-semibold text-gray-800">
        {count} selected
      </span>
      {children}
    </div>
  )
}
