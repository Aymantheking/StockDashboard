import type { ReactNode } from "react"

export function IconButton({
  icon,
  label,
  onClick,
  tone = "neutral",
  disabled = false,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
  tone?: "blue" | "red" | "green" | "yellow" | "neutral" | "purple"
  disabled?: boolean
}) {
  const tones = {
    blue: "border-blue-200 text-blue-700 hover:bg-blue-50",
    red: "border-red-200 text-red-700 hover:bg-red-50",
    green: "border-green-200 text-green-700 hover:bg-green-50",
    yellow: "border-yellow-300 bg-yellow-50 text-yellow-800 hover:bg-yellow-100",
    neutral: "border-gray-300 text-gray-700 hover:bg-gray-100",
    purple: "border-purple-200 text-purple-700 hover:bg-purple-50",
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition disabled:cursor-not-allowed disabled:opacity-40 ${tones[tone]}`}
    >
      {icon}
    </button>
  )
}
