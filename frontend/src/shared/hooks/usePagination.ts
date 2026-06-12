import { useEffect, useMemo, useState } from "react"

export function usePagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const result = useMemo(() => {
    const startIndex = (page - 1) * pageSize
    return {
      items: items.slice(startIndex, startIndex + pageSize),
      page,
      totalPages,
      start: items.length === 0 ? 0 : startIndex + 1,
      end: Math.min(startIndex + pageSize, items.length),
      total: items.length,
    }
  }, [items, page, pageSize, totalPages])

  return { ...result, setPage }
}

export function getPageItems<T>(items: T[], page: number, pageSize = 10) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(Math.max(page, 1), totalPages)
  const start = (safePage - 1) * pageSize

  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    totalPages,
    total: items.length,
    start: items.length === 0 ? 0 : start + 1,
    end: Math.min(start + pageSize, items.length),
  }
}
