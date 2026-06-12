import type { ReactNode } from "react"

export function Modal({
  title,
  children,
  onClose,
  maxWidth = "max-w-2xl",
}: {
  title: string
  children: ReactNode
  onClose: () => void
  maxWidth?: string
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <section
        className={`max-h-[90vh] w-full overflow-y-auto rounded-lg bg-white p-6 shadow-xl ${maxWidth}`}
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded border px-3 py-1.5 text-sm"
          >
            Close
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}
