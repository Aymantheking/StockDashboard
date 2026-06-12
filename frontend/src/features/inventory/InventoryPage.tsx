import { useEffect, useMemo, useRef, useState } from "react"
import { FilePlus2, Pencil, ShoppingCart, Trash2 } from "lucide-react"
import { BulkActionBar } from "../../shared/components/BulkActionBar"
import { ConfirmModal } from "../../shared/components/ConfirmModal"
import { FilterPanel } from "../../shared/components/FilterPanel"
import { IconButton } from "../../shared/components/IconButton"
import { Pagination } from "../../shared/components/Pagination"
import {
  SelectionCell,
  SelectionHeader,
} from "../../shared/components/TableSelection"
import {
  applyFilterConditions,
  type FilterCondition,
  type FilterField,
  type FilterMatchMode,
} from "../../shared/hooks/useFilters"
import { usePageSelection } from "../../shared/hooks/usePageSelection"
import { getPageItems } from "../../shared/hooks/usePagination"
import { inventoryApi } from "../../services/api/inventoryApi"
import {
  purchaseApi,
  type CreatePurchaseInput,
} from "../../services/api/purchaseApi"
import { requestApi } from "../../services/api/requestApi"
import { PrioritySelector } from "../purchases/PrioritySelector"
import type { PurchasePriority } from "../purchases/purchasesTypes"
import type { Part } from "./inventoryTypes"

export type InventoryPageProps = {
  parts: Part[]
  isLoadingParts: boolean
  partsError: string | null
  reloadParts: () => Promise<void>
  reloadAnalytics: () => Promise<void>
  reloadPurchases: () => Promise<void>
  setPartsError: React.Dispatch<React.SetStateAction<string | null>>
  canManageParts: boolean
  canBuyParts: boolean
  canRequestParts: boolean
  reloadRequests: () => Promise<void>
  reloadNotificationSummary: () => Promise<void>
  lowStockThreshold: number
}

const emptyPart: Part = {
  id: 0,
  name: "",
  category: "",
  manufacturer: "",
  reference: "",
  quantity: 0,
  totalQuantity: 0,
  availableQuantity: 0,
  reservedQuantity: 0,
  borrowedQuantity: 0,
  damagedQuantity: 0,
  location: "",
  description: "",
  stockAllocationNote: "",
  status: "",
}

export function InventoryPage({
  parts,
  isLoadingParts,
  partsError,
  reloadParts,
  reloadAnalytics,
  reloadPurchases,
  setPartsError,
  canManageParts,
  canBuyParts,
  canRequestParts,
  reloadRequests,
  reloadNotificationSummary,
  lowStockThreshold,
}: InventoryPageProps) {
  const [search, setSearch] = useState("")
  const [advancedFilters, setAdvancedFilters] = useState<FilterCondition[]>([])
  const [advancedMatchMode, setAdvancedMatchMode] =
    useState<FilterMatchMode>("all")
  const [page, setPage] = useState(1)
  const [editingPart, setEditingPart] = useState<Part | null>(null)
  const [deletingPart, setDeletingPart] = useState<Part | null>(null)
  const [requestingPart, setRequestingPart] = useState<Part | null>(null)
  const [buyingPart, setBuyingPart] = useState<Part | null>(null)
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
  const [isBulkBuyOpen, setIsBulkBuyOpen] = useState(false)
  const purchaseSaveInFlight = useRef(false)

  const inventoryFilterFields: FilterField<Part>[] = [
    { key: "name", label: "Name", type: "text", getValue: (part) => part.name },
    { key: "category", label: "Category", type: "text", getValue: (part) => part.category },
    { key: "manufacturer", label: "Manufacturer", type: "text", getValue: (part) => part.manufacturer },
    { key: "reference", label: "Reference", type: "text", getValue: (part) => part.reference },
    { key: "location", label: "Location", type: "text", getValue: (part) => part.location },
    { key: "totalQuantity", label: "Total quantity", type: "number", getValue: (part) => part.totalQuantity },
    { key: "availableQuantity", label: "Available quantity", type: "number", getValue: (part) => part.availableQuantity },
    { key: "reservedQuantity", label: "Reserved quantity", type: "number", getValue: (part) => part.reservedQuantity },
    { key: "borrowedQuantity", label: "Borrowed quantity", type: "number", getValue: (part) => part.borrowedQuantity },
    { key: "damagedQuantity", label: "Damaged quantity", type: "number", getValue: (part) => part.damagedQuantity },
    { key: "status", label: "Status", type: "text", getValue: (part) => part.status },
  ]
  const filteredParts = useMemo(() => {
    const query = search.trim().toLowerCase()
    const searchedParts = parts.filter(
      (part) =>
        !query ||
        [part.name, part.category, part.manufacturer, part.reference, part.location]
          .join(" ")
          .toLowerCase()
          .includes(query)
    )
    return applyFilterConditions(
      searchedParts,
      inventoryFilterFields,
      advancedFilters,
      advancedMatchMode
    ).sort((first, second) =>
      first.name.localeCompare(second.name, undefined, { sensitivity: "base" })
    )
  }, [parts, search, advancedFilters, advancedMatchMode])
  const paginatedParts = getPageItems(filteredParts, page)
  const partSelection = usePageSelection(paginatedParts.items, page)
  const selectedParts = paginatedParts.items.filter((part) =>
    partSelection.selectedIds.has(part.id)
  )

  useEffect(() => setPage(1), [search, advancedFilters, advancedMatchMode])

  async function savePart(part: Part) {
    const { id, ...input } = part
    try {
      setPartsError(null)
      if (id) {
        await inventoryApi.update(id, input)
      } else {
        await inventoryApi.create(input)
      }
      await Promise.all([reloadParts(), reloadAnalytics()])
      setEditingPart(null)
    } catch {
      setPartsError(id ? "Failed to update part" : "Failed to create part")
    }
  }

  async function deletePart() {
    if (!deletingPart) {
      return
    }
    try {
      setPartsError(null)
      await inventoryApi.remove(deletingPart.id)
      await Promise.all([reloadParts(), reloadAnalytics()])
      setDeletingPart(null)
    } catch {
      setPartsError("Failed to delete part")
    }
  }

  async function deleteSelectedParts() {
    try {
      setPartsError(null)
      await Promise.all(
        selectedParts.map((part) => inventoryApi.remove(part.id))
      )
      await Promise.all([reloadParts(), reloadAnalytics()])
      partSelection.clear()
      setIsBulkDeleteOpen(false)
    } catch {
      setPartsError("Failed to delete selected parts")
    }
  }

  async function createPurchase(input: CreatePurchaseInput) {
    if (purchaseSaveInFlight.current) {
      return
    }

    purchaseSaveInFlight.current = true
    try {
      setPartsError(null)
      await purchaseApi.create(input)
      await Promise.all([
        reloadParts(),
        reloadPurchases(),
        reloadNotificationSummary(),
      ])
      setBuyingPart(null)
    } catch {
      setPartsError("Failed to create purchase request")
    } finally {
      purchaseSaveInFlight.current = false
    }
  }

  async function createBulkPurchases(input: {
    quantity: number
    reason: string
    priority: PurchasePriority
  }) {
    if (purchaseSaveInFlight.current) {
      return
    }

    purchaseSaveInFlight.current = true
    try {
      setPartsError(null)
      await Promise.all(
        selectedParts.map((part) =>
          purchaseApi.create({
            sourcePartId: part.id,
            itemName: part.name,
            category: part.category,
            manufacturer: part.manufacturer,
            reference: part.reference,
            ...input,
          })
        )
      )
      await Promise.all([
        reloadParts(),
        reloadPurchases(),
        reloadNotificationSummary(),
      ])
      partSelection.clear()
      setIsBulkBuyOpen(false)
    } catch {
      setPartsError("Failed to create purchase requests")
    } finally {
      purchaseSaveInFlight.current = false
    }
  }

  async function requestPart(input: {
    quantity: number
    requestType: "Reservation" | "Borrow"
    reason: string
    startDate: string
    dueDate: string
  }) {
    if (!requestingPart) {
      return
    }
    try {
      setPartsError(null)
      await requestApi.create({
        partId: requestingPart.id,
        quantity: input.quantity,
        requestType: input.requestType,
        reason: input.reason,
        expectedReturnDate: input.dueDate,
        usageDate: input.requestType === "Reservation" ? input.startDate : undefined,
        startDate: input.requestType === "Borrow" ? input.startDate : undefined,
        dueDate: input.requestType === "Borrow" ? input.dueDate : undefined,
      })
      await Promise.all([reloadRequests(), reloadNotificationSummary()])
      setRequestingPart(null)
    } catch {
      setPartsError("Failed to submit part request")
    }
  }

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold">Inventory</h2>
          <p className="mt-1 text-sm text-gray-500">
            {parts.length} parts tracked, low stock threshold {lowStockThreshold}
          </p>
        </div>
        {canManageParts && (
          <button
            onClick={() => setEditingPart(emptyPart)}
            className="rounded bg-yellow-400 px-4 py-2 font-semibold text-black"
          >
            + Add Part
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg bg-white p-6 shadow">
        {isLoadingParts && (
          <div className="mb-6 rounded border border-gray-200 bg-gray-50 px-4 py-3 text-gray-600">
            Loading inventory...
          </div>
        )}
        {partsError && (
          <div className="mb-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {partsError}
          </div>
        )}
        <div className="mb-6 flex w-full items-center gap-2 sm:w-auto">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, reference, category, manufacturer..."
            className="min-w-0 flex-1 rounded border border-gray-300 px-4 py-2 sm:w-[420px] sm:flex-none"
          />
          <FilterPanel
            fields={inventoryFilterFields}
            conditions={advancedFilters}
            matchMode={advancedMatchMode}
            onApply={(conditions, mode) => {
              setAdvancedFilters(conditions)
              setAdvancedMatchMode(mode)
            }}
          />
        </div>

        <BulkActionBar count={partSelection.selectedCount}>
          {canBuyParts && (
            <button
              onClick={() => setIsBulkBuyOpen(true)}
              className="rounded bg-yellow-400 px-3 py-2 text-sm font-semibold text-black"
            >
              Buy selected
            </button>
          )}
          {canManageParts && (
            <button
              onClick={() => setIsBulkDeleteOpen(true)}
              className="rounded bg-red-600 px-3 py-2 text-sm font-semibold text-white"
            >
              Delete selected
            </button>
          )}
        </BulkActionBar>

        <table className="w-full min-w-[1180px]">
          <thead>
            <tr className="border-b bg-gray-100 text-xs uppercase text-gray-600">
              <SelectionHeader
                checked={partSelection.allSelected}
                onChange={partSelection.toggleAll}
              />
              <th className="px-3 py-3 text-left">Part</th>
              <th className="px-3 py-3 text-left">Category</th>
              <th className="px-3 py-3 text-left">Reference</th>
              <th className="px-3 py-3 text-left">Manufacturer</th>
              <th className="px-3 py-3 text-right">Total</th>
              <th className="px-3 py-3 text-right">Available</th>
              <th className="px-3 py-3 text-right">Reserved</th>
              <th className="px-3 py-3 text-right">Borrowed</th>
              <th className="px-3 py-3 text-right">Damaged</th>
              <th className="px-3 py-3 text-left">Location</th>
              <th className="px-3 py-3 text-left">Status</th>
              <th className="px-3 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedParts.items.map((part) => {
              const lowStock = part.availableQuantity <= lowStockThreshold
              return (
                <tr
                  key={part.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 ${
                    partSelection.selectedIds.has(part.id) ? "bg-yellow-50" : ""
                  }`}
                >
                  <SelectionCell
                    checked={partSelection.selectedIds.has(part.id)}
                    onChange={() => partSelection.toggle(part.id)}
                    label={`Select ${part.name}`}
                  />
                  <td className="px-3 py-3 font-semibold">{part.name}</td>
                  <td className="px-3 py-3">{part.category}</td>
                  <td className="px-3 py-3">{part.reference}</td>
                  <td className="px-3 py-3">{part.manufacturer || "-"}</td>
                  <td className="px-3 py-3 text-right">{part.totalQuantity}</td>
                  <td className={`px-3 py-3 text-right font-semibold ${lowStock ? "text-red-600" : ""}`}>
                    {part.availableQuantity}
                  </td>
                  <td className="px-3 py-3 text-right">{part.reservedQuantity}</td>
                  <td className="px-3 py-3 text-right">{part.borrowedQuantity}</td>
                  <td className="px-3 py-3 text-right">{part.damagedQuantity}</td>
                  <td className="px-3 py-3">{part.location}</td>
                  <td className="px-3 py-3">{part.status || (lowStock ? "Low Stock" : "Available")}</td>
                  <td className="px-3 py-3">
                    <div className="flex gap-2">
                      {canRequestParts && part.availableQuantity > 0 && (
                        <IconButton
                          icon={<FilePlus2 className="h-4 w-4" />}
                          label={`Request ${part.name}`}
                          onClick={() => setRequestingPart(part)}
                          tone="yellow"
                        />
                      )}
                      {canBuyParts && (
                        <IconButton
                          icon={<ShoppingCart className="h-4 w-4" />}
                          label={`Purchase ${part.name}`}
                          onClick={() => setBuyingPart(part)}
                          tone="yellow"
                        />
                      )}
                      {canManageParts && (
                        <>
                          <IconButton
                            icon={<Pencil className="h-4 w-4" />}
                            label="Edit part"
                            onClick={() => setEditingPart(part)}
                            tone="blue"
                          />
                          <IconButton
                            icon={<Trash2 className="h-4 w-4" />}
                            label="Delete part"
                            onClick={() => setDeletingPart(part)}
                            tone="red"
                          />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <Pagination
          page={paginatedParts.page}
          totalPages={paginatedParts.totalPages}
          start={paginatedParts.start}
          end={paginatedParts.end}
          total={paginatedParts.total}
          onPageChange={setPage}
        />
      </div>

      {editingPart && (
        <PartModal
          part={editingPart}
          onClose={() => setEditingPart(null)}
          onSave={savePart}
        />
      )}
      {requestingPart && (
        <PartRequestModal
          part={requestingPart}
          onClose={() => setRequestingPart(null)}
          onSave={requestPart}
        />
      )}
      {buyingPart && (
        <BuyPartModal
          part={buyingPart}
          onClose={() => setBuyingPart(null)}
          onSave={createPurchase}
        />
      )}
      {deletingPart && (
        <ConfirmModal
          title="Delete Part"
          message={`Delete ${deletingPart.name}? This action cannot be undone.`}
          confirmLabel="Delete"
          onClose={() => setDeletingPart(null)}
          onConfirm={deletePart}
        />
      )}
      {isBulkDeleteOpen && (
        <ConfirmModal
          title="Delete Parts"
          message={`Delete ${partSelection.selectedCount} selected parts? This action cannot be undone.`}
          confirmLabel="Delete selected"
          onClose={() => setIsBulkDeleteOpen(false)}
          onConfirm={deleteSelectedParts}
        />
      )}
      {isBulkBuyOpen && (
        <BulkBuyPartsModal
          parts={selectedParts}
          onClose={() => setIsBulkBuyOpen(false)}
          onSave={createBulkPurchases}
        />
      )}
    </>
  )
}

function PartModal({
  part,
  onClose,
  onSave,
}: {
  part: Part
  onClose: () => void
  onSave: (part: Part) => void | Promise<void>
}) {
  const [form, setForm] = useState(part)
  const update = (field: keyof Part, value: string | number) =>
    setForm((current) => ({ ...current, [field]: value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-lg">
        <h3 className="mb-6 text-2xl font-bold">{part.id ? "Edit Part" : "Add Part"}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {(["name", "category", "manufacturer", "reference", "location"] as const).map((field) => (
            <input
              key={field}
              value={form[field]}
              onChange={(event) => update(field, event.target.value)}
              placeholder={field[0].toUpperCase() + field.slice(1)}
              className="rounded border px-4 py-2"
            />
          ))}
          {(["totalQuantity", "availableQuantity", "reservedQuantity", "borrowedQuantity", "damagedQuantity"] as const).map((field) => (
            <input
              key={field}
              type="number"
              min={0}
              value={form[field]}
              onChange={(event) => update(field, Number(event.target.value))}
              className="rounded border px-4 py-2"
            />
          ))}
          <textarea
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
            placeholder="Description"
            className="rounded border px-4 py-2 sm:col-span-2"
          />
          <textarea
            value={form.stockAllocationNote}
            onChange={(event) => update("stockAllocationNote", event.target.value)}
            placeholder="Stock allocation note"
            className="rounded border px-4 py-2 sm:col-span-2"
          />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded border px-4 py-2">Cancel</button>
          <button
            onClick={() =>
              onSave({
                ...form,
                quantity: form.availableQuantity,
                totalQuantity:
                  form.availableQuantity +
                  form.reservedQuantity +
                  form.borrowedQuantity +
                  form.damagedQuantity,
              })
            }
            disabled={!form.name.trim() || !form.category.trim() || !form.reference.trim()}
            className="rounded bg-yellow-400 px-4 py-2 font-semibold disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

function BuyPartModal({
  part,
  onClose,
  onSave,
}: {
  part: Part
  onClose: () => void
  onSave: (purchase: CreatePurchaseInput) => void | Promise<void>
}) {
  const [quantity, setQuantity] = useState(1)
  const [reason, setReason] = useState("")
  const [priority, setPriority] = useState<PurchasePriority>("Medium")
  const hasInvalidQuantity = quantity <= 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-2 text-2xl font-bold">Buy Part</h3>
        <p className="mb-6 text-gray-600">
          Create a purchase request for {part.name}.
        </p>

        <div className="space-y-4">
          <input
            value={`${part.name} (${part.reference})`}
            className="w-full rounded border bg-gray-100 px-4 py-2"
            disabled
          />
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
            className="w-full rounded border px-4 py-2"
          />
          {hasInvalidQuantity && (
            <p className="text-sm text-red-600">
              Quantity must be greater than 0
            </p>
          )}
          <PrioritySelector value={priority} onChange={setPriority} />
          <textarea
            placeholder="Reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="min-h-28 w-full rounded border px-4 py-2"
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded border px-4 py-2">
            Cancel
          </button>
          <button
            onClick={() =>
              onSave({
                sourcePartId: part.id,
                itemName: part.name,
                category: part.category,
                manufacturer: part.manufacturer,
                reference: part.reference,
                quantity,
                reason,
                priority,
              })
            }
            disabled={hasInvalidQuantity || !reason.trim()}
            className="rounded bg-yellow-400 px-4 py-2 font-semibold text-black disabled:opacity-60"
          >
            Create Purchase
          </button>
        </div>
      </div>
    </div>
  )
}

function BulkBuyPartsModal({
  parts,
  onClose,
  onSave,
}: {
  parts: Part[]
  onClose: () => void
  onSave: (input: {
    quantity: number
    reason: string
    priority: PurchasePriority
  }) => void | Promise<void>
}) {
  const [quantity, setQuantity] = useState(1)
  const [reason, setReason] = useState("")
  const [priority, setPriority] = useState<PurchasePriority>("Medium")
  const hasInvalidQuantity = quantity <= 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-2 text-2xl font-bold">Buy Selected Parts</h3>
        <p className="mb-4 text-gray-600">
          Create purchase requests for {parts.length} selected parts.
        </p>
        <div className="mb-4 max-h-32 overflow-y-auto rounded border bg-gray-50 px-4 py-3 text-sm text-gray-700">
          {parts.map((part) => (
            <div key={part.id}>
              {part.name} ({part.reference})
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
            className="w-full rounded border px-4 py-2"
            aria-label="Quantity for each selected part"
          />
          {hasInvalidQuantity && (
            <p className="text-sm text-red-600">
              Quantity must be greater than 0
            </p>
          )}
          <PrioritySelector value={priority} onChange={setPriority} />
          <textarea
            placeholder="Reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="min-h-28 w-full rounded border px-4 py-2"
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded border px-4 py-2">
            Cancel
          </button>
          <button
            onClick={() => onSave({ quantity, reason, priority })}
            disabled={
              parts.length === 0 || hasInvalidQuantity || !reason.trim()
            }
            className="rounded bg-yellow-400 px-4 py-2 font-semibold text-black disabled:opacity-60"
          >
            Create Purchases
          </button>
        </div>
      </div>
    </div>
  )
}

function PartRequestModal({
  part,
  onClose,
  onSave,
}: {
  part: Part
  onClose: () => void
  onSave: (input: {
    quantity: number
    requestType: "Reservation" | "Borrow"
    reason: string
    startDate: string
    dueDate: string
  }) => void | Promise<void>
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [quantity, setQuantity] = useState(1)
  const [requestType, setRequestType] = useState<"Reservation" | "Borrow">("Reservation")
  const [reason, setReason] = useState("")
  const [startDate, setStartDate] = useState(today)
  const [dueDate, setDueDate] = useState(today)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h3 className="mb-1 text-2xl font-bold">Request {part.name}</h3>
        <p className="mb-6 text-sm text-gray-500">{part.availableQuantity} available</p>
        <div className="space-y-4">
          <select value={requestType} onChange={(event) => setRequestType(event.target.value as "Reservation" | "Borrow")} className="w-full rounded border px-4 py-2">
            <option>Reservation</option>
            <option>Borrow</option>
          </select>
          <input type="number" min={1} max={part.availableQuantity} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="w-full rounded border px-4 py-2" />
          <input type="date" min={today} value={startDate} onChange={(event) => setStartDate(event.target.value)} className="w-full rounded border px-4 py-2" />
          <input type="date" min={startDate} value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="w-full rounded border px-4 py-2" />
          <textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason" className="w-full rounded border px-4 py-2" />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded border px-4 py-2">Cancel</button>
          <button
            onClick={() => onSave({ quantity, requestType, reason, startDate, dueDate })}
            disabled={quantity < 1 || quantity > part.availableQuantity || !reason.trim()}
            className="rounded bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  )
}
