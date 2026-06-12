import type { ReactNode } from "react"

export function AppLayout({
  header,
  sidebar,
  children,
}: {
  header: ReactNode
  sidebar: ReactNode
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      {header}
      <div className="flex items-start">
        {sidebar}
        <main className="min-w-0 flex-1 p-4 transition-all duration-300 sm:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
