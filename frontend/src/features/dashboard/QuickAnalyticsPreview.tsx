import type { ReactNode } from "react"

export function QuickAnalyticsPreview({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-lg bg-white p-6 shadow">
      <h3 className="mb-4 text-xl font-bold">Quick Analytics Preview</h3>
      {children}
    </section>
  )
}
