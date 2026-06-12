import { useEffect, useState } from "react"

export function usePageSelection<T extends { id: number }>(
  items: T[],
  page: number
) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const pageIds = items.map((item) => item.id)
  const allSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id))

  useEffect(() => {
    setSelectedIds(new Set())
  }, [page])

  function toggle(id: number) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(pageIds))
  }

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    allSelected,
    toggle,
    toggleAll,
    clear: () => setSelectedIds(new Set()),
  }
}
