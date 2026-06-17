import { useEffect, useState } from "react"
import { Pencil, Trash2 } from "lucide-react"
import type { ApiFetch } from "../../shared/api/apiClient"
import { endpoints } from "../../shared/api/endpoints"
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
import type { Supplier } from "./suppliersTypes"

const SUPPLIERS_API_URL = endpoints.suppliers
export function SuppliersPage({
  suppliers,
  isLoadingSuppliers,
  suppliersError,
  apiFetch,
  reloadSuppliers,
  setSuppliersError,
  canEditSuppliers,
  canDeleteSuppliers,
}: {
  suppliers: Supplier[]
  isLoadingSuppliers: boolean
  suppliersError: string | null
  apiFetch: ApiFetch
  reloadSuppliers: () => Promise<void>
  setSuppliersError: React.Dispatch<React.SetStateAction<string | null>>
  canEditSuppliers: boolean
  canDeleteSuppliers: boolean
}) {
  const [search, setSearch] = useState("")
  const [advancedFilters, setAdvancedFilters] = useState<FilterCondition[]>([])
  const [advancedMatchMode, setAdvancedMatchMode] =
    useState<FilterMatchMode>("all")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null)
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
  const [page, setPage] = useState(1)

  const supplierFilterFields: FilterField<Supplier>[] = [
    { key: "name", label: "Name", type: "text", getValue: (item) => item.name },
    { key: "contact", label: "Contact person", type: "text", getValue: (item) => item.contactPerson },
    { key: "email", label: "Email", type: "text", getValue: (item) => item.email },
    { key: "country", label: "Country", type: "text", getValue: (item) => item.country },
    { key: "status", label: "Status", type: "select", options: ["Active", "Inactive"], getValue: (item) => item.status },
  ]
  const filteredSuppliers = applyFilterConditions(
    suppliers.filter((supplier) => {
      const normalizedSearch = search.toLowerCase()
      return (
        supplier.name.toLowerCase().includes(normalizedSearch) ||
        supplier.contactPerson.toLowerCase().includes(normalizedSearch) ||
        supplier.email.toLowerCase().includes(normalizedSearch) ||
        supplier.country.toLowerCase().includes(normalizedSearch)
      )
    }),
    supplierFilterFields,
    advancedFilters,
    advancedMatchMode
  )
  const paginatedSuppliers = getPageItems(filteredSuppliers, page)
  const supplierSelection = usePageSelection(paginatedSuppliers.items, page)

  useEffect(() => {
    setPage(1)
  }, [search, advancedFilters, advancedMatchMode])

  async function handleSave(supplier: Supplier) {
    const { id, ...supplierPayload } = supplier

    try {
      setSuppliersError(null)
      const response = await apiFetch(
        editingSupplier ? `${SUPPLIERS_API_URL}/${id}` : SUPPLIERS_API_URL,
        {
          method: editingSupplier ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(supplierPayload),
        }
      )

      if (!response.ok) {
        throw new Error("Failed to save supplier")
      }

      await reloadSuppliers()
      setIsModalOpen(false)
      setEditingSupplier(null)
    } catch {
      setSuppliersError("Failed to save supplier")
    }
  }

  async function handleDelete(id: number) {
    try {
      setSuppliersError(null)
      const response = await apiFetch(`${SUPPLIERS_API_URL}/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete supplier")
      }

      await reloadSuppliers()
    } catch {
      setSuppliersError("Failed to delete supplier")
    }
  }

  async function handleBulkDeleteSuppliers() {
    try {
      setSuppliersError(null)
      const responses = await Promise.all(
        [...supplierSelection.selectedIds].map((id) =>
          apiFetch(`${SUPPLIERS_API_URL}/${id}`, { method: "DELETE" })
        )
      )
      if (responses.some((response) => !response.ok)) {
        throw new Error("Failed to delete selected suppliers")
      }
      await reloadSuppliers()
      supplierSelection.clear()
      setIsBulkDeleteOpen(false)
    } catch {
      setSuppliersError("Failed to delete selected suppliers")
    }
  }

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold">Suppliers</h2>
          <p className="text-gray-500">
            Manage supplier contacts for purchase requests.
          </p>
        </div>
        {canEditSuppliers && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="rounded bg-yellow-400 px-4 py-2 font-semibold text-black"
          >
            + Add Supplier
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg bg-white p-6 shadow">
        {isLoadingSuppliers && (
          <div className="mb-6 rounded border border-gray-200 bg-gray-50 px-4 py-3 text-gray-600">
            Loading suppliers...
          </div>
        )}
        {suppliersError && (
          <div className="mb-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {suppliersError}
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <input
              type="text"
              placeholder="Search suppliers..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="min-w-0 flex-1 rounded border border-gray-300 px-4 py-2 sm:w-[300px] sm:flex-none"
            />
            <FilterPanel
              fields={supplierFilterFields}
              conditions={advancedFilters}
              matchMode={advancedMatchMode}
              onApply={(conditions, mode) => {
                setAdvancedFilters(conditions)
                setAdvancedMatchMode(mode)
              }}
            />
          </div>
        </div>
        <BulkToolbar count={supplierSelection.selectedCount}>
          {canDeleteSuppliers && (
            <button
              onClick={() => setIsBulkDeleteOpen(true)}
              className="rounded bg-red-600 px-3 py-2 text-sm font-semibold text-white"
            >
              Delete selected
            </button>
          )}
        </BulkToolbar>

        <table className="w-full min-w-[1100px]">
          <thead>
            <tr className="border-b bg-gray-100 text-xs uppercase text-gray-600">
              <SelectionHeader
                checked={supplierSelection.allSelected}
                onChange={supplierSelection.toggleAll}
              />
              <th className="px-2 py-3 text-left">Name</th>
              <th className="px-2 py-3 text-left">Contact Person</th>
              <th className="px-2 py-3 text-left">Email</th>
              <th className="px-2 py-3 text-left">Phone</th>
              <th className="px-2 py-3 text-left">Website</th>
              <th className="px-2 py-3 text-left">Country</th>
              <th className="px-2 py-3 text-left">Status</th>
              {canEditSuppliers && (
                <th className="px-2 py-3 text-left">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedSuppliers.items.map((supplier) => (
              <tr
                key={supplier.id}
                className={`border-b hover:bg-gray-50 ${
                  supplierSelection.selectedIds.has(supplier.id)
                    ? "bg-yellow-50"
                    : ""
                }`}
              >
                <SelectionCell
                  checked={supplierSelection.selectedIds.has(supplier.id)}
                  onChange={() => supplierSelection.toggle(supplier.id)}
                  label={`Select ${supplier.name}`}
                />
                <td className="px-2 py-3 font-medium">{supplier.name}</td>
                <td className="px-2 py-3">{supplier.contactPerson || "-"}</td>
                <td className="px-2 py-3">{supplier.email || "-"}</td>
                <td className="px-2 py-3">{supplier.phone || "-"}</td>
                <td className="px-2 py-3">{supplier.website || "-"}</td>
                <td className="px-2 py-3">{supplier.country || "-"}</td>
                <td className="px-2 py-3">
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-semibold ${supplier.status === "Active"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-700"
                      }`}
                  >
                    {supplier.status}
                  </span>
                </td>
                {canEditSuppliers && (
                  <td className="w-28 px-2 py-3">
                    <div className="flex items-center gap-2">
                      <IconButton
                        icon={<Pencil className="h-4 w-4" />}
                        label="Edit supplier"
                        onClick={() => {
                          setEditingSupplier(supplier)
                          setIsModalOpen(true)
                        }}
                        tone="blue"
                      />
                      {canDeleteSuppliers && (
                        <IconButton
                          icon={<Trash2 className="h-4 w-4" />}
                          label="Delete supplier"
                          onClick={() => setDeletingSupplier(supplier)}
                          tone="red"
                        />
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {filteredSuppliers.length === 0 && (
              <tr>
                <td
                  colSpan={canEditSuppliers ? 9 : 8}
                  className="py-8 text-center text-gray-500"
                >
                  No suppliers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination
          page={paginatedSuppliers.page}
          totalPages={paginatedSuppliers.totalPages}
          start={paginatedSuppliers.start}
          end={paginatedSuppliers.end}
          total={paginatedSuppliers.total}
          onPageChange={setPage}
        />
      </div>

      {isModalOpen && (
        <SupplierModal
          supplier={editingSupplier}
          onClose={() => {
            setIsModalOpen(false)
            setEditingSupplier(null)
          }}
          onSave={handleSave}
        />
      )}
      {isBulkDeleteOpen && (
        <BulkConfirmModal
          title="Delete suppliers"
          message={`Delete ${supplierSelection.selectedCount} selected suppliers?`}
          confirmLabel="Delete selected"
          onClose={() => setIsBulkDeleteOpen(false)}
          onConfirm={handleBulkDeleteSuppliers}
        />
      )}
      {deletingSupplier && (
        <BulkConfirmModal
          title={`Delete ${deletingSupplier.name}?`}
          message={`Delete supplier ${deletingSupplier.name}?`}
          confirmLabel="Delete"
          onClose={() => setDeletingSupplier(null)}
          onConfirm={async () => {
            await handleDelete(deletingSupplier.id)
            setDeletingSupplier(null)
          }}
        />
      )}
    </>
  )
}

function SupplierModal({
  supplier,
  onClose,
  onSave,
}: {
  supplier: Supplier | null
  onClose: () => void
  onSave: (supplier: Supplier) => void
}) {
  const [form, setForm] = useState<Supplier>(
    supplier || {
      id: Date.now(),
      name: "",
      contactPerson: "",
      email: "",
      phone: "",
      website: "",
      country: "",
      notes: "",
      status: "Active",
    }
  )

  function updateField(field: keyof Supplier, value: string) {
    setForm({ ...form, [field]: value })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-2xl font-bold">
          {supplier ? "Edit Supplier" : "Add Supplier"}
        </h3>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input
            placeholder="Supplier name"
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            className="rounded border px-4 py-2"
          />
          <input
            placeholder="Contact person"
            value={form.contactPerson}
            onChange={(event) =>
              updateField("contactPerson", event.target.value)
            }
            className="rounded border px-4 py-2"
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            className="rounded border px-4 py-2"
          />
          <input
            placeholder="Phone"
            value={form.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            className="rounded border px-4 py-2"
          />
          <input
            placeholder="Website"
            value={form.website}
            onChange={(event) => updateField("website", event.target.value)}
            className="rounded border px-4 py-2"
          />
          <input
            placeholder="Country"
            value={form.country}
            onChange={(event) => updateField("country", event.target.value)}
            className="rounded border px-4 py-2"
          />
          <select
            value={form.status}
            onChange={(event) =>
              updateField("status", event.target.value as Supplier["status"])
            }
            className="rounded border px-4 py-2"
          >
            <option>Active</option>
            <option>Inactive</option>
          </select>
          <textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(event) => updateField("notes", event.target.value)}
            className="min-h-24 rounded border px-4 py-2 sm:col-span-2"
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded border px-4 py-2">
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={!form.name}
            className="rounded bg-yellow-400 px-4 py-2 font-semibold text-black disabled:opacity-60"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

