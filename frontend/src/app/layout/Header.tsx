import type { ReactNode } from "react"
import type { AuthUser } from "../../features/auth/authTypes"

export function Header({
  currentUser,
  notificationCount,
  notifications,
  onToggleNotifications,
  onLogout,
}: {
  currentUser: AuthUser
  notificationCount: number
  notifications?: ReactNode
  onToggleNotifications: () => void
  onLogout: () => void
}) {
  return (
    <header className="sticky top-0 z-50 flex min-h-20 items-center justify-between bg-black px-4 py-2 text-white shadow-lg sm:px-6">
      <h1 className="text-lg font-bold text-yellow-400 sm:text-2xl">
        Bertrandt Inventory System
      </h1>

      <div className="relative flex items-center gap-4">
        <button
          onClick={onToggleNotifications}
          className="relative rounded-full border border-gray-700 p-2 text-yellow-400 hover:border-yellow-400"
          title="Notifications"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {notificationCount > 0 && (
            <span className="absolute -right-2 -top-2 min-w-5 rounded-full bg-yellow-400 px-1.5 py-0.5 text-xs font-bold text-black">
              {notificationCount}
            </span>
          )}
        </button>

        {notifications}

        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold">{currentUser.name}</p>
          <p className="text-xs text-gray-300">{currentUser.role}</p>
        </div>

        <button
          onClick={onLogout}
          className="rounded border border-yellow-400 px-3 py-2 text-sm font-semibold text-yellow-400 hover:bg-yellow-400 hover:text-black"
        >
          Logout
        </button>

        <img
          src="/logo.png"
          alt="Bertrandt"
          className="h-10 w-auto object-contain sm:h-12 md:h-14"
        />
      </div>
    </header>
  )
}
