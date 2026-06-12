import { useEffect, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"
import { PriorityBadge as PriorityIndicator } from "../../shared/components/PriorityBadge"
import type { PurchasePriority } from "./purchasesTypes"

const purchasePriorities: PurchasePriority[] = [
  "Low",
  "Medium",
  "High",
  "Critical",
]
export function PrioritySelector({
  value,
  onChange,
  disabled = false,
}: {
  value: PurchasePriority
  onChange: (priority: PurchasePriority) => void
  disabled?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick)
    return () => document.removeEventListener("mousedown", closeOnOutsideClick)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="flex min-h-11 w-full items-center justify-between rounded border border-gray-300 bg-white px-3 py-2 text-left transition hover:border-gray-400 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-60"
      >
        <PriorityIndicator priority={value} showLabel />
        <ChevronDown
          className={`h-4 w-4 text-gray-500 transition ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && !disabled && (
        <div
          role="listbox"
          className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white p-1 shadow-xl"
        >
          {purchasePriorities.map((priority) => (
            <button
              key={priority}
              type="button"
              role="option"
              aria-selected={value === priority}
              onClick={() => {
                onChange(priority)
                setIsOpen(false)
              }}
              className={`flex w-full items-center rounded-md px-2 py-2 text-left transition ${
                value === priority ? "bg-gray-100" : "hover:bg-gray-50"
              }`}
            >
              <PriorityIndicator priority={priority} showLabel />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
