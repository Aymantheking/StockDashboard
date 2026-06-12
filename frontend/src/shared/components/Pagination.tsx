export function Pagination({
  page,
  totalPages,
  start,
  end,
  total,
  onPageChange,
  pageSize = 10,
}: {
  page: number
  totalPages: number
  start: number
  end: number
  total: number
  onPageChange: (page: number) => void
  pageSize?: number
}) {
  if (total <= pageSize) {
    return null
  }

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
      <span>
        Showing {start}-{end} of {total}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded border px-3 py-1.5 font-medium disabled:opacity-40"
        >
          Previous
        </button>
        <span className="min-w-24 text-center">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="rounded border px-3 py-1.5 font-medium disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  )
}
