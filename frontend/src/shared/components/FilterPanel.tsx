import { useState } from "react"
import { Filter as FilterIcon, Plus, Trash2, X } from "lucide-react"
import {
  createFilterCondition,
  getFilterOperators,
  type FilterCondition,
  type FilterField,
  type FilterMatchMode,
  type FilterOperator,
} from "../hooks/useFilters"
export function FilterPanel<T>({
  fields,
  conditions,
  matchMode,
  onApply,
}: {
  fields: FilterField<T>[]
  conditions: FilterCondition[]
  matchMode: FilterMatchMode
  onApply: (conditions: FilterCondition[], matchMode: FilterMatchMode) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [draftConditions, setDraftConditions] = useState<FilterCondition[]>([])
  const [draftMatchMode, setDraftMatchMode] =
    useState<FilterMatchMode>(matchMode)
  const activeCount = conditions.filter((condition) => condition.value).length

  function openPanel() {
    setDraftConditions(
      conditions.length
        ? conditions.map((condition) => ({ ...condition }))
        : [createFilterCondition(fields[0].key)]
    )
    setDraftMatchMode(matchMode)
    setIsOpen(true)
  }

  function updateCondition(id: number, updates: Partial<FilterCondition>) {
    setDraftConditions((current) =>
      current.map((condition) =>
        condition.id === id ? { ...condition, ...updates } : condition
      )
    )
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={openPanel}
        className="inline-flex h-10 items-center gap-2 rounded border border-gray-300 bg-white px-4 font-medium text-gray-700 transition hover:border-yellow-400 hover:bg-yellow-50"
      >
        <FilterIcon className="h-4 w-4" />
        Filter
        {activeCount > 0 && (
          <span className="rounded-full bg-yellow-400 px-2 py-0.5 text-xs font-bold text-black">
            {activeCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-12 z-40 w-[min(92vw,760px)] rounded-lg border border-gray-200 bg-white p-4 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900">Advanced filters</h3>
              <p className="text-xs text-gray-500">
                Combine conditions for a more precise result.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded text-gray-500 hover:bg-gray-100"
              title="Close filters"
              aria-label="Close filters"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-4 inline-flex rounded border border-gray-200 bg-gray-50 p-1">
            {(["all", "any"] as FilterMatchMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setDraftMatchMode(mode)}
                className={`rounded px-3 py-1.5 text-sm font-medium ${draftMatchMode === mode
                    ? "bg-white text-black shadow-sm"
                    : "text-gray-500"
                  }`}
              >
                Match {mode}
              </button>
            ))}
          </div>

          <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
            {draftConditions.map((condition) => {
              const field =
                fields.find((candidate) => candidate.key === condition.field) ||
                fields[0]
              const operators = getFilterOperators(field.type)

              return (
                <div
                  key={condition.id}
                  className="grid gap-2 rounded border border-gray-200 bg-gray-50 p-3 md:grid-cols-[1.2fr_1fr_1.5fr_auto]"
                >
                  <select
                    value={condition.field}
                    onChange={(event) => {
                      const nextField =
                        fields.find(
                          (candidate) => candidate.key === event.target.value
                        ) || fields[0]
                      updateCondition(condition.id, {
                        field: nextField.key,
                        operator: getFilterOperators(nextField.type)[0],
                        value: "",
                        valueTo: "",
                      })
                    }}
                    className="rounded border border-gray-300 bg-white px-3 py-2 text-sm"
                  >
                    {fields.map((candidate) => (
                      <option key={candidate.key} value={candidate.key}>
                        {candidate.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={condition.operator}
                    onChange={(event) =>
                      updateCondition(condition.id, {
                        operator: event.target.value as FilterOperator,
                        valueTo: "",
                      })
                    }
                    className="rounded border border-gray-300 bg-white px-3 py-2 text-sm"
                  >
                    {operators.map((operator) => (
                      <option key={operator}>{operator}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    {field.type === "select" ? (
                      <select
                        value={condition.value}
                        onChange={(event) =>
                          updateCondition(condition.id, {
                            value: event.target.value,
                          })
                        }
                        className="min-w-0 flex-1 rounded border border-gray-300 bg-white px-3 py-2 text-sm"
                      >
                        <option value="">Select value</option>
                        {field.options?.map((option) => (
                          <option key={option}>{option}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={
                          field.type === "number"
                            ? "number"
                            : field.type === "date"
                              ? "date"
                              : "text"
                        }
                        value={condition.value}
                        onChange={(event) =>
                          updateCondition(condition.id, {
                            value: event.target.value,
                          })
                        }
                        placeholder="Value"
                        className="min-w-0 flex-1 rounded border border-gray-300 bg-white px-3 py-2 text-sm"
                      />
                    )}
                    {condition.operator === "between" && (
                      <input
                        type={field.type === "date" ? "date" : "number"}
                        value={condition.valueTo}
                        onChange={(event) =>
                          updateCondition(condition.id, {
                            valueTo: event.target.value,
                          })
                        }
                        aria-label="Second filter value"
                        className="min-w-0 flex-1 rounded border border-gray-300 bg-white px-3 py-2 text-sm"
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setDraftConditions((current) =>
                        current.length === 1
                          ? [createFilterCondition(fields[0].key)]
                          : current.filter((item) => item.id !== condition.id)
                      )
                    }
                    className="inline-flex h-9 w-9 items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-700"
                    title="Remove condition"
                    aria-label="Remove condition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={() =>
                setDraftConditions((current) => [
                  ...current,
                  createFilterCondition(fields[0].key),
                ])
              }
              className="inline-flex items-center gap-2 rounded border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Plus className="h-4 w-4" />
              Add condition
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onApply([], "all")
                  setIsOpen(false)
                }}
                className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Clear filters
              </button>
              <button
                type="button"
                onClick={() => {
                  onApply(
                    draftConditions.filter((condition) => condition.value),
                    draftMatchMode
                  )
                  setIsOpen(false)
                }}
                className="rounded bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300"
              >
                Apply filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

