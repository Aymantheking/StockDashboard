export function SelectionHeader({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: () => void
}) {
  return (
    <th className="w-10 px-2 py-3 text-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label="Select all rows on this page"
        className="h-4 w-4 accent-yellow-400"
      />
    </th>
  )
}

export function SelectionCell({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: () => void
  label: string
}) {
  return (
    <td className="w-10 px-2 py-3 text-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={label}
        className="h-4 w-4 accent-yellow-400"
      />
    </td>
  )
}
