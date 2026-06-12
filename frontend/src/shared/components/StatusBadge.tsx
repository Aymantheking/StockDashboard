export function StatusBadge({
  status,
  className = "",
}: {
  status: string
  className?: string
}) {
  return (
    <span
      className={`inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 ${className}`}
    >
      {status}
    </span>
  )
}
