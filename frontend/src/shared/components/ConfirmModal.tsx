import { useState } from "react"

export function ConfirmModal({
  title,
  message,
  confirmLabel,
  tone = "red",
  commentLabel,
  commentRequired = false,
  onClose,
  onConfirm,
}: {
  title: string
  message: string
  confirmLabel: string
  tone?: "red" | "green" | "yellow"
  commentLabel?: string
  commentRequired?: boolean
  onClose: () => void
  onConfirm: (comment: string) => void
}) {
  const [comment, setComment] = useState("")
  const toneClasses = {
    red: "bg-red-600 text-white",
    green: "bg-green-600 text-white",
    yellow: "bg-yellow-400 text-black",
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-xl font-bold">{title}</h3>
        <p className="mt-2 text-gray-600">{message}</p>
        {commentLabel && (
          <label className="mt-5 block space-y-2">
            <span className="text-sm font-semibold text-gray-700">
              {commentLabel}
            </span>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              className="min-h-24 w-full rounded border px-3 py-2"
            />
          </label>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded border px-4 py-2">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(comment.trim())}
            disabled={commentRequired && !comment.trim()}
            className={`rounded px-4 py-2 font-semibold disabled:opacity-50 ${toneClasses[tone]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
