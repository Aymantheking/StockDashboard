export function StatCard({
  label,
  value,
  color = "text-black",
}: {
  label: string
  value: string
  color?: string
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-gray-500">{label}</p>
      <h3 className={`text-3xl font-bold ${color}`}>{value}</h3>
    </div>
  )
}
