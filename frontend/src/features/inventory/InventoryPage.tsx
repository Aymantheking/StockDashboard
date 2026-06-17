import { useEffect, useMemo, useRef, useState } from "react"
import {
  Eye,
  FilePlus2,
  MessageSquarePlus,
  Pencil,
  ShoppingCart,
  Trash2,
} from "lucide-react"
import { BulkActionBar } from "../../shared/components/BulkActionBar"
import { ConfirmModal } from "../../shared/components/ConfirmModal"
import { FilterPanel } from "../../shared/components/FilterPanel"
import { IconButton } from "../../shared/components/IconButton"
import { Pagination } from "../../shared/components/Pagination"
import { StatusBadge } from "../../shared/components/StatusBadge"
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
import { MissingItemRequestModal } from "../requests/requestWorkflowPages"
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
  stockLocations: string[]
  inventoryCategories: string[]
}

const emptyPart: Part = {
  id: 0,
  name: "",
  category: "",
  manufacturer: "",
  reference: "",
  quantity: 1,
  totalQuantity: 1,
  availableQuantity: 1,
  reservedQuantity: 0,
  borrowedQuantity: 0,
  damagedQuantity: 0,
  location: "",
  description: "",
  imageData: "",
  stockAllocationNote: "",
  status: "",
}

function getInventoryStatus(part: Part, lowStockThreshold: number) {
  if (part.availableQuantity <= 0) {
    return "Not Available"
  }
  if (part.availableQuantity <= lowStockThreshold) {
    return "Low Stock"
  }
  return part.status || "Available"
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object" &&
    (error as { response?: unknown }).response !== null
  ) {
    const status = (error as { response?: { status?: number } }).response?.status
    if (status === 413) {
      return `${fallback} (${status})`
    }
    const data = (
      error as {
        response?: { data?: { message?: string | string[]; error?: string } }
      }
    ).response?.data
    if (Array.isArray(data?.message)) {
      return data.message.join(", ")
    }
    if (data?.message) {
      return data.message
    }
    if (data?.error) {
      return data.error
    }
  }

  return fallback
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
  stockLocations,
  inventoryCategories,
}: InventoryPageProps) {
  const [search, setSearch] = useState("")
  const [advancedFilters, setAdvancedFilters] = useState<FilterCondition[]>([])
  const [advancedMatchMode, setAdvancedMatchMode] =
    useState<FilterMatchMode>("all")
  const [page, setPage] = useState(1)
  const [editingPart, setEditingPart] = useState<Part | null>(null)
  const [deletingPart, setDeletingPart] = useState<Part | null>(null)
  const [requestingPart, setRequestingPart] = useState<Part | null>(null)
  const [missingRequestPart, setMissingRequestPart] = useState<Part | null>(null)
  const [viewingPart, setViewingPart] = useState<Part | null>(null)
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
      return null
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        id ? "Failed to update part" : "Failed to create part"
      )
      if (
        message.toLowerCase().includes("payload") ||
        message.includes("413")
      ) {
        return "Image is too large. Please upload a smaller image."
      }
      return message
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
      return null
    } catch (error) {
      return getApiErrorMessage(error, "Failed to submit part request")
    }
  }

  async function createMissingItemRequest(input: {
    partId?: number | null
    itemName: string
    category: string
    manufacturer: string
    reference: string
    quantityNeeded: number
    reason: string
    neededDate: string
  }) {
    try {
      setPartsError(null)
      await requestApi.createMissing(input)
      await Promise.all([reloadRequests(), reloadNotificationSummary()])
      return null
    } catch (error) {
      return getApiErrorMessage(error, "Failed to submit missing item request")
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
              <th className="px-3 py-3 text-center">Total</th>
              <th className="px-3 py-3 text-center">Available</th>
              <th className="px-3 py-3 text-center">Reserved</th>
              <th className="px-3 py-3 text-center">Borrowed</th>
              <th className="px-3 py-3 text-center">Damaged</th>
              <th className="px-3 py-3 text-left">Location</th>
              <th className="px-3 py-3 text-left">Status</th>
              <th className="px-3 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedParts.items.map((part) => {
              const status = getInventoryStatus(part, lowStockThreshold)
              const lowStock = status === "Low Stock"
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
                  <td className="px-3 py-3">{part.category || "N/A"}</td>
                  <td className="px-3 py-3">{part.reference || "N/A"}</td>
                  <td className="px-3 py-3">{part.manufacturer || "N/A"}</td>
                  <td className="px-3 py-3 text-center">{part.totalQuantity}</td>
                  <td className={`px-3 py-3 text-center font-semibold ${lowStock ? "text-orange-600" : ""}`}>
                    {part.availableQuantity}
                  </td>
                  <td className="px-3 py-3 text-center">{part.reservedQuantity}</td>
                  <td className="px-3 py-3 text-center">{part.borrowedQuantity}</td>
                  <td className="px-3 py-3 text-center">{part.damagedQuantity}</td>
                  <td className="px-3 py-3">{part.location || "N/A"}</td>
                  <td className="px-3 py-3">
                    <StatusBadge status={status} />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-2">
                      {canRequestParts && (
                        part.availableQuantity > 0 ? (
                          <IconButton
                            icon={<FilePlus2 className="h-4 w-4" />}
                            label="Request this part"
                            onClick={() => setRequestingPart(part)}
                            tone="yellow"
                          />
                        ) : (
                          <IconButton
                            icon={<MessageSquarePlus className="h-4 w-4" />}
                            label="Ask manager"
                            onClick={() => setMissingRequestPart(part)}
                            tone="yellow"
                          />
                        )
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
                            icon={<Eye className="h-4 w-4" />}
                            label="View part details"
                            onClick={() => setViewingPart(part)}
                            tone="neutral"
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
          stockLocations={stockLocations}
          inventoryCategories={inventoryCategories}
          onClose={() => setEditingPart(null)}
          onSave={savePart}
        />
      )}
      {viewingPart && (
        <PartDetailsModal
          part={viewingPart}
          status={getInventoryStatus(viewingPart, lowStockThreshold)}
          onClose={() => setViewingPart(null)}
        />
      )}
      {requestingPart && (
        <PartRequestModal
          part={requestingPart}
          onClose={() => setRequestingPart(null)}
          onSave={requestPart}
        />
      )}
      {missingRequestPart && (
        <MissingItemRequestModal
          initialValues={{
            partId: missingRequestPart.id,
            itemName: missingRequestPart.name,
            category: missingRequestPart.category,
            manufacturer: missingRequestPart.manufacturer,
            reference: missingRequestPart.reference,
            quantityNeeded: 1,
          }}
          lockIdentityFields
          inventoryCategories={inventoryCategories}
          onClose={() => setMissingRequestPart(null)}
          onSave={createMissingItemRequest}
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
  stockLocations,
  inventoryCategories,
  onClose,
  onSave,
}: {
  part: Part
  stockLocations: string[]
  inventoryCategories: string[]
  onClose: () => void
  onSave: (part: Part) => string | null | void | Promise<string | null | void>
}) {
  const [form, setForm] = useState(part)
  const [imageError, setImageError] = useState("")
  const [submitError, setSubmitError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [categoryMode, setCategoryMode] = useState(
    inventoryCategories.includes(part.category) ? part.category : "Other"
  )
  const [locationMode, setLocationMode] = useState(
    stockLocations.includes(part.location) ? part.location : "Other"
  )
  const update = (field: keyof Part, value: string | number) =>
    setForm((current) => ({ ...current, [field]: value }))
  const updateQuantity = (
    field:
      | "availableQuantity"
      | "reservedQuantity"
      | "borrowedQuantity"
      | "damagedQuantity",
    value: number
  ) => update(field, Math.max(0, Number.isFinite(value) ? value : 0))
  const categoryOptions = [...new Set([...inventoryCategories, "Other"])]
  const locationOptions = [...new Set([...stockLocations, "Other"])]
  const calculatedTotal =
    form.availableQuantity +
    form.reservedQuantity +
    form.borrowedQuantity +
    form.damagedQuantity

  function updateCategory(value: string) {
    setCategoryMode(value)
    update("category", value === "Other" ? "" : value)
  }

  function updateLocation(value: string) {
    setLocationMode(value)
    update("location", value === "Other" ? "" : value)
  }

  function updateImage(file: File | undefined) {
    setImageError("")
    if (!file) {
      return
    }
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      setImageError("Image must be a PNG, JPG, JPEG, or WEBP file.")
      return
    }
    if (file.size > 1024 * 1024) {
      setImageError("Image must be smaller than 1MB.")
      return
    }
    const reader = new FileReader()
    // TODO: replace base64 image storage with multipart upload/file storage.
    reader.onload = () => update("imageData", String(reader.result || ""))
    reader.readAsDataURL(file)
  }

  async function submit() {
    setSubmitError("")
    if (imageError) {
      return
    }

    setIsSaving(true)
    const error = await onSave({
      ...form,
      quantity: form.availableQuantity,
      totalQuantity: calculatedTotal,
    })
    setIsSaving(false)

    if (error) {
      setSubmitError(error)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-lg">
        <h3 className="mb-6 text-2xl font-bold">{part.id ? "Edit Part" : "Add Part"}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-gray-700">Part name</span>
            <input
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
              className="w-full rounded border px-4 py-2"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-gray-700">Manufacturer</span>
            <input
              value={form.manufacturer}
              onChange={(event) => update("manufacturer", event.target.value)}
              className="w-full rounded border px-4 py-2"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-gray-700">Reference</span>
            <input
              value={form.reference}
              onChange={(event) => update("reference", event.target.value)}
              className="w-full rounded border px-4 py-2"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-gray-700">Category</span>
            <select
              value={categoryMode}
              onChange={(event) => updateCategory(event.target.value)}
              className="w-full rounded border px-4 py-2"
            >
              {categoryOptions.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>
          {categoryMode === "Other" && (
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">Custom category</span>
              <input
                value={form.category}
                onChange={(event) => update("category", event.target.value)}
                className="w-full rounded border px-4 py-2"
              />
            </label>
          )}
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-gray-700">Location</span>
            <select
              value={locationMode}
              onChange={(event) => updateLocation(event.target.value)}
              className="w-full rounded border px-4 py-2"
            >
              {locationOptions.map((location) => (
                <option key={location}>{location}</option>
              ))}
            </select>
          </label>
          {locationMode === "Other" && (
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">Custom location</span>
              <input
                value={form.location}
                onChange={(event) => update("location", event.target.value)}
                className="w-full rounded border px-4 py-2"
              />
            </label>
          )}
          <div className="sm:col-span-2">
            <h4 className="mb-2 font-semibold">Stock quantities</h4>
            <p className="mb-3 text-sm text-gray-500">
              Total stock is calculated automatically from available + reserved + borrowed + damaged.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["availableQuantity", "Available quantity"],
                ["reservedQuantity", "Reserved quantity"],
                ["borrowedQuantity", "Borrowed quantity"],
                ["damagedQuantity", "Damaged quantity"],
              ].map(([field, label]) => (
                <label key={field} className="block">
                  <span className="mb-1 block text-sm font-semibold text-gray-700">{label}</span>
                  <input
                    type="number"
                    min={0}
                    value={form[field as keyof Part] as number}
                    onChange={(event) =>
                      updateQuantity(
                        field as
                          | "availableQuantity"
                          | "reservedQuantity"
                          | "borrowedQuantity"
                          | "damagedQuantity",
                        Number(event.target.value)
                      )
                    }
                    className="w-full rounded border px-4 py-2"
                  />
                </label>
              ))}
            </div>
            <p className="mt-3 rounded bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700">
              Calculated total: {calculatedTotal}
            </p>
          </div>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-semibold text-gray-700">Description</span>
            <textarea
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
              className="min-h-24 w-full rounded border px-4 py-2"
            />
          </label>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-gray-700">Part image</label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={(event) => updateImage(event.target.files?.[0])}
              className="w-full rounded border px-4 py-2"
            />
            {imageError && <p className="mt-2 text-sm text-red-600">{imageError}</p>}
            {form.imageData && (
              <img
                src={form.imageData}
                alt={`${form.name || "Part"} preview`}
                className="mt-3 max-h-48 rounded border object-contain"
              />
            )}
          </div>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-semibold text-gray-700">Stock allocation note</span>
            <textarea
              value={form.stockAllocationNote}
              onChange={(event) => update("stockAllocationNote", event.target.value)}
              className="w-full rounded border px-4 py-2"
            />
          </label>
        </div>
        {submitError && (
          <div className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded border px-4 py-2">Cancel</button>
          <button
            onClick={submit}
            disabled={!form.name.trim() || !form.category.trim() || Boolean(imageError) || isSaving}
            className="rounded bg-yellow-400 px-4 py-2 font-semibold disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}

function PartDetailsModal({
  part,
  status,
  onClose,
}: {
  part: Part
  status: string
  onClose: () => void
}) {
  const calculatedTotal =
    part.availableQuantity +
    part.reservedQuantity +
    part.borrowedQuantity +
    part.damagedQuantity
  const rows = [
    ["Category", part.category || "N/A"],
    ["Reference", part.reference || "N/A"],
    ["Manufacturer", part.manufacturer || "N/A"],
    ["Calculated total", calculatedTotal],
    ["Available quantity", part.availableQuantity],
    ["Reserved quantity", part.reservedQuantity],
    ["Borrowed quantity", part.borrowedQuantity],
    ["Damaged quantity", part.damagedQuantity],
    ["Location", part.location || "N/A"],
    ["Created at", part.createdAt ? new Date(part.createdAt).toLocaleString() : "N/A"],
    ["Updated at", part.updatedAt ? new Date(part.updatedAt).toLocaleString() : "N/A"],
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-lg">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold">{part.name}</h3>
            <div className="mt-2">
              <StatusBadge status={status} />
            </div>
          </div>
        </div>
        {part.imageData && (
          <img
            src={part.imageData}
            alt={part.name}
            className="mb-6 max-h-64 w-full rounded border object-contain"
          />
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="rounded border border-gray-100 bg-gray-50 p-3">
              <p className="text-xs font-semibold uppercase text-gray-500">{label}</p>
              <p className="mt-1 font-medium">{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded border border-gray-100 bg-gray-50 p-3">
          <p className="text-xs font-semibold uppercase text-gray-500">Description</p>
          <p className="mt-1 whitespace-pre-wrap">{part.description || "N/A"}</p>
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
            value={`${part.name} (${part.reference || "N/A"})`}
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
              {part.name} ({part.reference || "N/A"})
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
  }) => string | null | void | Promise<string | null | void>
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [quantity, setQuantity] = useState(1)
  const [requestType, setRequestType] = useState<"Reservation" | "Borrow">("Reservation")
  const [reason, setReason] = useState("")
  const [startDate, setStartDate] = useState(today)
  const [dueDate, setDueDate] = useState(today)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  function validate() {
    const nextErrors: Record<string, string> = {}
    const normalizedQuantity = Number(quantity)

    if (!Number.isInteger(normalizedQuantity) || normalizedQuantity < 1) {
      nextErrors.quantity = "Quantity must be at least 1"
    } else if (normalizedQuantity > part.availableQuantity) {
      nextErrors.quantity = `Quantity cannot exceed available stock (${part.availableQuantity})`
    }

    if (!reason.trim()) {
      nextErrors.reason = "Reason is required"
    }

    if (requestType === "Reservation") {
      if (!startDate) {
        nextErrors.startDate = "Usage Date is required"
      } else if (startDate < today) {
        nextErrors.startDate = "Usage Date cannot be in the past"
      }
    } else {
      if (!startDate) {
        nextErrors.startDate = "Start Date is required"
      } else if (startDate < today) {
        nextErrors.startDate = "Start Date cannot be in the past"
      }
      if (!dueDate) {
        nextErrors.dueDate = "Due Date is required"
      } else if (dueDate < startDate) {
        nextErrors.dueDate = "Due Date cannot be before Start Date"
      }
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function submit() {
    setSubmitError("")
    if (!validate()) {
      return
    }

    const effectiveDueDate = requestType === "Reservation" ? startDate : dueDate
    setIsSubmitting(true)
    const error = await onSave({
      quantity,
      requestType,
      reason: reason.trim(),
      startDate,
      dueDate: effectiveDueDate,
    })
    setIsSubmitting(false)

    if (error) {
      setSubmitError(error)
      return
    }

    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h3 className="mb-1 text-2xl font-bold">Request {part.name}</h3>
        <p className="mb-6 text-sm text-gray-500">{part.availableQuantity} available</p>
        <div className="space-y-4">
          <select
            value={requestType}
            onChange={(event) => {
              const nextType = event.target.value as "Reservation" | "Borrow"
              setRequestType(nextType)
              if (nextType === "Reservation") {
                setDueDate(startDate)
              }
            }}
            className="w-full rounded border px-4 py-2"
          >
            <option>Reservation</option>
            <option>Borrow</option>
          </select>
          <div>
            <input
              type="number"
              min={1}
              max={part.availableQuantity}
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
              className="w-full rounded border px-4 py-2"
            />
            {errors.quantity && <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {requestType === "Reservation" ? "Usage Date" : "Start Date"}
            </label>
            <input
              type="date"
              min={today}
              value={startDate}
              onChange={(event) => {
                setStartDate(event.target.value)
                if (requestType === "Reservation") {
                  setDueDate(event.target.value)
                }
              }}
              className="w-full rounded border px-4 py-2"
            />
            {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>}
          </div>
          {requestType === "Borrow" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Due Date</label>
              <input
                type="date"
                min={startDate || today}
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="w-full rounded border px-4 py-2"
              />
              {errors.dueDate && <p className="mt-1 text-sm text-red-600">{errors.dueDate}</p>}
            </div>
          )}
          <div>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Reason"
              className="w-full rounded border px-4 py-2"
            />
            {errors.reason && <p className="mt-1 text-sm text-red-600">{errors.reason}</p>}
          </div>
        </div>
        {submitError && (
          <div className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded border px-4 py-2">Cancel</button>
          <button
            onClick={submit}
            disabled={isSubmitting}
            className="rounded bg-yellow-400 px-4 py-2 font-semibold text-black disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  )
}
