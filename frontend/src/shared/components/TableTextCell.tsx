export function TableTextCell({
  value,
  className = "",
}: {
  value?: string | null
  className?: string
}) {
  const fullText = value?.trim() || "-"
  const displayText =
    fullText.length > 35 ? `${fullText.slice(0, 35)}...` : fullText

  return (
    <span
      className={`block max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap ${className}`}
      title={fullText}
    >
      {displayText}
    </span>
  )
}
