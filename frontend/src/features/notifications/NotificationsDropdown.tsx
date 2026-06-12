import { CheckCircle, Trash2 } from "lucide-react"
import type {
  NotificationItemSummary,
  NotificationSummary,
} from "./notificationsTypes"

export function NotificationsDropdown({
  summary,
  onNavigate,
  onMarkAllSeen,
  onDelete,
  onClearRead,
}: {
  summary: NotificationSummary
  onNavigate: (item: NotificationItemSummary) => void
  onMarkAllSeen: () => void
  onDelete: (notificationId: string) => void
  onClearRead: () => void
}) {
  if (summary.totalUnread > 0 && summary.items.length === 0) {
    console.warn("Notification summary has pending count but no items", summary)
  }

  return (
    <div className="absolute right-0 top-14 z-20 w-96 rounded-lg bg-white p-4 text-black shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-bold">Notifications</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onMarkAllSeen}
            className="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-200 text-gray-600 transition hover:border-green-300 hover:bg-green-50 hover:text-green-700"
            title="Mark all as read"
            aria-label="Mark all notifications as read"
          >
            <CheckCircle className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClearRead}
            className="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-200 text-gray-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
            title="Clear read notifications"
            aria-label="Clear read notifications"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800">
            {summary.totalUnread} total
          </span>
        </div>
      </div>

      <div className="max-h-80 space-y-3 overflow-y-auto">
        {summary.items.map((item) => (
          <NotificationItem
            key={item.id}
            item={item}
            onClick={() => onNavigate(item)}
            onClear={() => onDelete(item.id)}
          />
        ))}
        {summary.totalUnread > 0 && summary.items.length === 0 && (
          <p className="rounded border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
            Pending actions exist but could not be loaded.
          </p>
        )}
        {summary.totalUnread === 0 && summary.items.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-500">
            No pending notifications.
          </p>
        )}
      </div>
    </div>
  )
}

function NotificationItem({
  item,
  onClick,
  onClear,
}: {
  item: NotificationItemSummary
  onClick: () => void
  onClear: () => void
}) {
  return (
    <div
      className={`flex items-start gap-2 rounded border p-2 transition hover:border-yellow-400 hover:bg-yellow-50 ${
        item.isRead
          ? "border-gray-200 bg-gray-50 opacity-75"
          : "border-yellow-200"
      }`}
    >
      <button onClick={onClick} className="min-w-0 flex-1 p-1 text-left">
        <p className="font-semibold">{item.title}</p>
        <p className="text-sm text-gray-600">{item.description}</p>
        {item.createdAt && (
          <p className="mt-1 text-xs text-gray-500">
            {new Date(item.createdAt).toLocaleString()}
          </p>
        )}
      </button>
      {item.actionable && !item.isRead ? (
        <span className="shrink-0 rounded-full bg-yellow-100 px-2 py-1 text-[10px] font-bold uppercase text-yellow-800">
          Action
        </span>
      ) : null}
      <button
        type="button"
        onClick={onClear}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded text-gray-400 transition hover:bg-red-50 hover:text-red-700"
        title="Delete notification"
        aria-label={`Delete ${item.title}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}
