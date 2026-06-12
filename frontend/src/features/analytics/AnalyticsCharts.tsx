import type { ReactNode } from "react"

export function ChartCard({
  title,
  chartId,
  children,
}: {
  title: string
  chartId?: string
  children: ReactNode
}) {
  return (
    <div id={chartId} className="rounded-lg bg-white p-6 shadow">
      <h3 className="mb-4 text-xl font-bold">{title}</h3>
      {children}
    </div>
  )
}

export function AnalyticsTable({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="overflow-x-auto rounded-lg bg-white p-6 shadow">
      <h3 className="mb-4 text-xl font-bold">{title}</h3>
      {children}
    </div>
  )
}
