import { useEffect, useState } from "react"
import { Eye, Pencil, Trash2 } from "lucide-react"
import { BulkActionBar as BulkToolbar } from "../../shared/components/BulkActionBar"
import { ConfirmModal as BulkConfirmModal } from "../../shared/components/ConfirmModal"
import { FilterPanel } from "../../shared/components/FilterPanel"
import { IconButton } from "../../shared/components/IconButton"
import { Pagination } from "../../shared/components/Pagination"
import { SelectionCell, SelectionHeader } from "../../shared/components/TableSelection"
import {
  applyFilterConditions,
  type FilterCondition,
  type FilterField,
  type FilterMatchMode,
} from "../../shared/hooks/useFilters"
import { usePageSelection } from "../../shared/hooks/usePageSelection"
import { getPageItems } from "../../shared/hooks/usePagination"
import type {
  CollaboratorGroup,
  Division,
} from "../../shared/types/organization"
import type { AuthUser } from "../auth/authTypes"
import type { PartRequest } from "../requests/requestsTypes"
import type { Collaborator, RatingHistoryItem } from "./collaboratorsTypes"
import { collaboratorApi } from "../../services/api/collaboratorApi"

const divisions: Division[] = [
  "Division 1",
  "Division 2",
  "Division 3",
  "Division 4",
  "Admin",
]
const collaboratorGroups: CollaboratorGroup[] = [
  "Group 1",
  "Group 2",
  "Group 3",
  "Group 4",
]
export function CollaboratorsPage({
  collaborators,
  isLoadingCollaborators,
  collaboratorsError,
  partRequests,
  users,
  reloadCollaborators,
  reloadAnalytics,
  setCollaboratorsError,
  canManageCollaborators,
  currentUser,
}: {
  collaborators: Collaborator[]
  isLoadingCollaborators: boolean
  collaboratorsError: string | null
  partRequests: PartRequest[]
  users: AuthUser[]
  reloadCollaborators: () => Promise<void>
  reloadAnalytics: () => Promise<void>
  setCollaboratorsError: React.Dispatch<React.SetStateAction<string | null>>
  canManageCollaborators: boolean
  currentUser: AuthUser
}) {
  const [search, setSearch] = useState("")
  const [advancedFilters, setAdvancedFilters] = useState<FilterCondition[]>([])
  const [advancedMatchMode, setAdvancedMatchMode] =
    useState<FilterMatchMode>("all")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCollaborator, setEditingCollaborator] =
    useState<Collaborator | null>(null)
  const [deletingCollaborator, setDeletingCollaborator] =
    useState<Collaborator | null>(null)
  const [ratingHistoryCollaborator, setRatingHistoryCollaborator] =
    useState<Collaborator | null>(null)
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
  const [page, setPage] = useState(1)

  const collaboratorFilterFields: FilterField<Collaborator>[] = [
    { key: "name", label: "Name", type: "text", getValue: (item) => item.name },
    { key: "email", label: "Email", type: "text", getValue: (item) => item.email },
    { key: "division", label: "Division", type: "select", options: divisions, getValue: (item) => item.division },
    { key: "group", label: "Group", type: "select", options: collaboratorGroups, getValue: (item) => item.group },
    { key: "role", label: "Role", type: "select", options: ["Admin", "Inventory Manager", "Collaborator", "Viewer"], getValue: (item) => item.role },
    { key: "rating", label: "Rating", type: "number", getValue: (item) => item.rating },
  ]
  const filteredCollaborators = applyFilterConditions(
    collaborators.filter((collaborator) => {
      const normalizedSearch = search.toLowerCase()
      return (
        collaborator.name.toLowerCase().includes(normalizedSearch) ||
        collaborator.email.toLowerCase().includes(normalizedSearch)
      )
    }),
    collaboratorFilterFields,
    advancedFilters,
    advancedMatchMode
  )
  const paginatedCollaborators = getPageItems(filteredCollaborators, page)
  const collaboratorSelection = usePageSelection(
    paginatedCollaborators.items,
    page
  )

  useEffect(() => {
    setPage(1)
  }, [search, advancedFilters, advancedMatchMode])

  async function handleDelete(id: number) {
    try {
      setCollaboratorsError(null)

      await collaboratorApi.remove(id)

      await reloadCollaborators()
      await reloadAnalytics()
    } catch {
      setCollaboratorsError("Failed to delete collaborator")
    }
  }

  async function handleSave(collaborator: Collaborator) {
    const { id, ...collaboratorPayload } = collaborator

    try {
      setCollaboratorsError(null)

      if (editingCollaborator) {
        await collaboratorApi.update(id, collaboratorPayload)
      } else {
        await collaboratorApi.create(collaboratorPayload)
      }

      await reloadCollaborators()
      await reloadAnalytics()
      setIsModalOpen(false)
      setEditingCollaborator(null)
    } catch {
      setCollaboratorsError(
        editingCollaborator
          ? "Failed to update collaborator"
          : "Failed to create collaborator"
      )
    }
  }

  async function handleBulkDeleteCollaborators() {
    try {
      setCollaboratorsError(null)
      await Promise.all(
        [...collaboratorSelection.selectedIds].map((id) =>
          collaboratorApi.remove(id)
        )
      )
      await reloadCollaborators()
      await reloadAnalytics()
      collaboratorSelection.clear()
      setIsBulkDeleteOpen(false)
    } catch {
      setCollaboratorsError("Failed to delete selected collaborators")
    }
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <h2 className="text-3xl font-bold">Collaborators</h2>

        {canManageCollaborators && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-yellow-400 text-black font-semibold px-4 py-2 rounded"
          >
            + Add Collaborator
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6 overflow-x-auto">
        {isLoadingCollaborators && (
          <div className="mb-6 rounded border border-gray-200 bg-gray-50 px-4 py-3 text-gray-600">
            Loading collaborators...
          </div>
        )}

        {collaboratorsError && (
          <div className="mb-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {collaboratorsError}
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-0 flex-1 rounded border border-gray-300 px-4 py-2 sm:w-[300px] sm:flex-none"
            />
            <FilterPanel
              fields={collaboratorFilterFields}
              conditions={advancedFilters}
              matchMode={advancedMatchMode}
              onApply={(conditions, mode) => {
                setAdvancedFilters(conditions)
                setAdvancedMatchMode(mode)
              }}
            />
          </div>

        </div>
        <BulkToolbar count={collaboratorSelection.selectedCount}>
          {canManageCollaborators && (
            <button
              onClick={() => setIsBulkDeleteOpen(true)}
              className="rounded bg-red-600 px-3 py-2 text-sm font-semibold text-white"
            >
              Delete selected
            </button>
          )}
        </BulkToolbar>

        <table className="w-full min-w-[1020px]">
          <thead>
            <tr className="border-b bg-gray-100 text-xs uppercase text-gray-600">
              <SelectionHeader
                checked={collaboratorSelection.allSelected}
                onChange={collaboratorSelection.toggleAll}
              />
              <th className="text-left py-3 px-2">Name</th>
              <th className="text-left py-3 px-2">Email</th>
              <th className="text-left py-3 px-2">Division</th>
              <th className="text-left py-3 px-2">Group</th>
              <th className="text-left py-3 px-2">Role</th>
              <th className="text-left py-3 px-2">Manager</th>
              <th className="text-left py-3 px-2">Rating</th>
              <th className="text-left py-3 px-2">Active Requests</th>
              <th className="text-left py-3 px-2">Borrowed Items</th>
              {(canManageCollaborators ||
                currentUser.role === "Inventory Manager") && (
                  <th className="text-left py-3 px-2">Actions</th>
                )}
            </tr>
          </thead>

          <tbody>
            {paginatedCollaborators.items.map((collaborator) => {
              const activeRequests = partRequests.filter(
                (request) =>
                  request.collaboratorId === collaborator.id &&
                  request.status !== "Returned" &&
                  request.status !== "Rejected" &&
                  request.status !== "Cancelled"
              ).length
              const borrowedItems = partRequests.filter(
                (request) =>
                  request.collaboratorId === collaborator.id &&
                  request.status === "Borrowed"
              ).length
              const assignedManager = users.find(
                (user) =>
                  user.role === "Inventory Manager" &&
                  user.managedDivision === collaborator.division
              )
              const managerName =
                assignedManager?.name ||
                (currentUser.role === "Inventory Manager" &&
                  currentUser.managedDivision === collaborator.division
                  ? currentUser.name
                  : "-")

              return (
                <tr
                  key={collaborator.id}
                  className={`border-b border-gray-100 transition hover:bg-gray-50 ${
                    collaboratorSelection.selectedIds.has(collaborator.id)
                      ? "bg-yellow-50"
                      : ""
                  }`}
                >
                  <SelectionCell
                    checked={collaboratorSelection.selectedIds.has(
                      collaborator.id
                    )}
                    onChange={() =>
                      collaboratorSelection.toggle(collaborator.id)
                    }
                    label={`Select ${collaborator.name}`}
                  />
                  <td className="py-3 px-2 font-medium">
                    {collaborator.name}
                  </td>
                  <td className="py-3 px-2">{collaborator.email}</td>
                  <td className="py-3 px-2">{collaborator.division}</td>
                  <td className="py-3 px-2">{collaborator.group}</td>
                  <td className="py-3 px-2">{collaborator.role}</td>
                  <td className="py-3 px-2">{managerName}</td>
                  <td className="py-3 px-2">
                    <StarRating rating={collaborator.rating || 5} />
                  </td>
                  <td className="py-3 px-2">{activeRequests}</td>
                  <td className="py-3 px-2">{borrowedItems}</td>
                  {(canManageCollaborators ||
                    currentUser.role === "Inventory Manager") && (
                      <td className="py-3 px-2">
                        <div className="flex w-36 flex-wrap items-center gap-2">
                          {canManageCollaborators && (
                            <IconButton
                              icon={<Pencil className="h-4 w-4" />}
                              label="Edit collaborator"
                              onClick={() => {
                                setEditingCollaborator(collaborator)
                                setIsModalOpen(true)
                              }}
                              tone="blue"
                            />
                          )}

                          {canManageCollaborators && (
                            <IconButton
                              icon={<Trash2 className="h-4 w-4" />}
                              label="Delete collaborator"
                              onClick={() => setDeletingCollaborator(collaborator)}
                              tone="red"
                            />
                          )}

                          <IconButton
                            icon={<Eye className="h-4 w-4" />}
                            label="View rating history"
                            onClick={() => setRatingHistoryCollaborator(collaborator)}
                            tone="yellow"
                          />
                        </div>
                      </td>
                    )}
                </tr>
              )
            })}

            {filteredCollaborators.length === 0 && (
              <tr>
                <td
                  colSpan={
                    canManageCollaborators ||
                      currentUser.role === "Inventory Manager"
                      ? 11
                      : 10
                  }
                  className="py-8 text-center text-gray-500"
                >
                  No collaborators found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination
          page={paginatedCollaborators.page}
          totalPages={paginatedCollaborators.totalPages}
          start={paginatedCollaborators.start}
          end={paginatedCollaborators.end}
          total={paginatedCollaborators.total}
          onPageChange={setPage}
        />
      </div>

      {isModalOpen && (
        <CollaboratorModal
          collaborator={editingCollaborator}
          onClose={() => {
            setIsModalOpen(false)
            setEditingCollaborator(null)
          }}
          onSave={handleSave}
        />
      )}

      {ratingHistoryCollaborator && (
        <RatingHistoryModal
          collaborator={ratingHistoryCollaborator}
          reloadCollaborators={reloadCollaborators}
          onClose={() => setRatingHistoryCollaborator(null)}
        />
      )}
      {deletingCollaborator && (
        <BulkConfirmModal
          title={`Delete ${deletingCollaborator.name}?`}
          message={`Delete collaborator ${deletingCollaborator.name}?`}
          confirmLabel="Delete"
          onClose={() => setDeletingCollaborator(null)}
          onConfirm={async () => {
            await handleDelete(deletingCollaborator.id)
            setDeletingCollaborator(null)
          }}
        />
      )}
      {isBulkDeleteOpen && (
        <BulkConfirmModal
          title="Delete collaborators"
          message={`Delete ${collaboratorSelection.selectedCount} selected collaborators?`}
          confirmLabel="Delete selected"
          onClose={() => setIsBulkDeleteOpen(false)}
          onConfirm={handleBulkDeleteCollaborators}
        />
      )}
    </>
  )
}

function StarRating({ rating }: { rating: number }) {
  const roundedRating = Math.round(rating * 2) / 2

  return (
    <span
      title="Rating reflects return behavior and respect of due dates."
      className="whitespace-nowrap text-sm"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={star <= roundedRating ? "text-yellow-500" : "text-gray-300"}
        >
          ★
        </span>
      ))}
      <span className="ml-2 text-gray-500">{roundedRating.toFixed(1)}</span>
    </span>
  )
}

function RatingHistoryModal({
  collaborator,
  reloadCollaborators,
  onClose,
}: {
  collaborator: Collaborator
  reloadCollaborators: () => Promise<void>
  onClose: () => void
}) {
  const [history, setHistory] = useState<RatingHistoryItem[]>([])
  const [rating, setRating] = useState(collaborator.rating || 5)
  const [reason, setReason] = useState("")
  const [error, setError] = useState("")
  const [page, setPage] = useState(1)
  const paginatedHistory = getPageItems(history, page)

  useEffect(() => {
    async function loadHistory() {
      try {
        setHistory(await collaboratorApi.ratingHistory(collaborator.id))
      } catch {
        setError("Failed to load rating history")
      }
    }

    loadHistory()
  }, [collaborator.id])

  async function saveRating() {
    try {
      setError("")
      await collaboratorApi.adjustRating(
        collaborator.id,
        rating,
        reason || "Manual rating adjustment"
      )

      await reloadCollaborators()
      onClose()
    } catch {
      setError("Failed to update rating")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-2xl font-bold">Rating History</h3>
        <p className="mt-1 text-gray-600">{collaborator.name}</p>

        {error && (
          <div className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-[120px_1fr_auto]">
          <input
            type="number"
            min={1}
            max={5}
            step={0.5}
            value={rating}
            onChange={(event) => setRating(Number(event.target.value))}
            className="rounded border px-4 py-2"
          />
          <input
            placeholder="Reason for adjustment"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="rounded border px-4 py-2"
          />
          <button
            onClick={saveRating}
            disabled={rating < 1 || rating > 5}
            className="rounded bg-yellow-400 px-4 py-2 font-semibold text-black disabled:opacity-60"
          >
            Save
          </button>
        </div>

        <div className="mt-6 max-h-72 overflow-y-auto">
          {paginatedHistory.items.map((item) => (
            <div key={item.id} className="border-b py-3">
              <p className="font-semibold">
                {item.previousRating} → {item.newRating}
              </p>
              <p className="text-sm text-gray-600">{item.reason}</p>
              <p className="text-xs text-gray-500">
                {item.changedBy} - {new Date(item.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
          {history.length === 0 && (
            <p className="py-6 text-center text-gray-500">
              No rating history yet.
            </p>
          )}
          <Pagination
            page={paginatedHistory.page}
            totalPages={paginatedHistory.totalPages}
            start={paginatedHistory.start}
            end={paginatedHistory.end}
            total={paginatedHistory.total}
            onPageChange={setPage}
          />
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="rounded border px-4 py-2">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function CollaboratorModal({
  collaborator,
  onClose,
  onSave,
}: {
  collaborator: Collaborator | null
  onClose: () => void
  onSave: (collaborator: Collaborator) => void
}) {
  const [form, setForm] = useState<Collaborator>(
    collaborator || {
      id: Date.now(),
      name: "",
      email: "",
      division: "Division 1",
      group: "Group 1",
      role: "",
      rating: 5,
    }
  )

  function updateField(field: keyof Collaborator, value: string | number) {
    setForm({ ...form, [field]: value })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-[500px]">
        <h3 className="text-2xl font-bold mb-6">
          {collaborator ? "Edit Collaborator" : "Add Collaborator"}
        </h3>

        <div className="space-y-4">
          <p className="font-semibold">Part information</p>
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            className="w-full border rounded px-4 py-2"
          />

          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            className="w-full border rounded px-4 py-2"
          />

          <select
            value={form.division}
            onChange={(e) =>
              updateField("division", e.target.value as Division)
            }
            className="w-full border rounded px-4 py-2"
          >
            {divisions.map((divisionName) => (
              <option key={divisionName}>{divisionName}</option>
            ))}
          </select>

          <select
            value={form.group}
            onChange={(e) =>
              updateField("group", e.target.value as CollaboratorGroup)
            }
            className="w-full border rounded px-4 py-2"
          >
            {collaboratorGroups.map((groupName) => (
              <option key={groupName}>{groupName}</option>
            ))}
          </select>

          <input
            placeholder="Role"
            value={form.role}
            onChange={(e) => updateField("role", e.target.value)}
            className="w-full border rounded px-4 py-2"
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 border rounded">
            Cancel
          </button>

          <button
            onClick={() => onSave(form)}
            className="px-4 py-2 bg-yellow-400 text-black font-semibold rounded"
            disabled={!form.name || !form.email || !form.role}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

