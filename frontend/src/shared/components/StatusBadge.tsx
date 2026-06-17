export function StatusBadge({
  status,
  className = "",
}: {
  status: string
  className?: string
}) {
  const normalizedStatus = status.toLowerCase()
  const statusClasses =
    normalizedStatus === "available"
      ? "bg-green-100 text-green-700"
      : normalizedStatus === "pending"
        ? "bg-yellow-100 text-yellow-800"
        : normalizedStatus === "approved" || normalizedStatus === "returned"
          ? "bg-green-100 text-green-800"
          : normalizedStatus === "reserved"
            ? "bg-orange-100 text-orange-800"
            : normalizedStatus === "borrowed"
              ? "bg-blue-100 text-blue-800"
              : normalizedStatus === "return pending"
                ? "bg-purple-100 text-purple-800"
      : normalizedStatus === "low stock"
        ? "bg-orange-100 text-orange-700"
        : normalizedStatus === "not available" || normalizedStatus === "damaged"
          ? "bg-red-100 text-red-700"
          : normalizedStatus === "rejected"
            ? "bg-red-100 text-red-800"
            : normalizedStatus === "cancelled"
              ? "bg-gray-100 text-gray-800"
              : "bg-gray-100 text-gray-700"

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses} ${className}`}
    >
      {status}
    </span>
  )
}
