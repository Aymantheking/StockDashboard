export type FilterFieldType = "text" | "number" | "select" | "date"

export type FilterOperator =
  | "is"
  | "contains"
  | "greater than"
  | "less than"
  | "before"
  | "after"
  | "between"

export type FilterMatchMode = "all" | "any"

export type FilterCondition = {
  id: number
  field: string
  operator: FilterOperator
  value: string
  valueTo: string
}

export type FilterField<T> = {
  key: string
  label: string
  type: FilterFieldType
  options?: string[]
  getValue: (item: T) => string | number | null | undefined
}

export function createFilterCondition(field: string): FilterCondition {
  return {
    id: Date.now() + Math.random(),
    field,
    operator: "contains",
    value: "",
    valueTo: "",
  }
}

export function getFilterOperators(type: FilterFieldType): FilterOperator[] {
  if (type === "number") {
    return ["is", "greater than", "less than", "between"]
  }
  if (type === "date") {
    return ["is", "before", "after", "between"]
  }
  if (type === "select") {
    return ["is"]
  }
  return ["contains", "is"]
}

export function applyFilterConditions<T>(
  items: T[],
  fields: FilterField<T>[],
  conditions: FilterCondition[],
  matchMode: FilterMatchMode
) {
  const activeConditions = conditions.filter(
    (condition) =>
      condition.value &&
      (condition.operator !== "between" || condition.valueTo)
  )

  if (activeConditions.length === 0) {
    return items
  }

  return items.filter((item) => {
    const matches = activeConditions.map((condition) => {
      const field = fields.find((candidate) => candidate.key === condition.field)
      if (!field) {
        return true
      }

      const rawValue = field.getValue(item)
      const itemValue = String(rawValue ?? "")

      if (field.type === "number") {
        const value = Number(rawValue)
        const from = Number(condition.value)
        const to = Number(condition.valueTo)
        if (!Number.isFinite(value) || !Number.isFinite(from)) {
          return false
        }
        if (condition.operator === "greater than") return value > from
        if (condition.operator === "less than") return value < from
        if (condition.operator === "between") {
          return (
            Number.isFinite(to) &&
            value >= Math.min(from, to) &&
            value <= Math.max(from, to)
          )
        }
        return value === from
      }

      if (field.type === "date") {
        const value = itemValue.slice(0, 10)
        if (condition.operator === "before") return value < condition.value
        if (condition.operator === "after") return value > condition.value
        if (condition.operator === "between") {
          return value >= condition.value && value <= condition.valueTo
        }
        return value === condition.value
      }

      const normalizedValue = itemValue.toLowerCase()
      const normalizedFilter = condition.value.toLowerCase()
      return condition.operator === "contains"
        ? normalizedValue.includes(normalizedFilter)
        : normalizedValue === normalizedFilter
    })

    return matchMode === "all" ? matches.every(Boolean) : matches.some(Boolean)
  })
}
