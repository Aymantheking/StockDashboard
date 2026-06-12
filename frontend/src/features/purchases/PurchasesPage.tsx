import { useEffect, useRef, useState } from "react"
import {
  CheckCircle,
  ClipboardCheck,
  Download,
  FileText,
  Pencil,
  ShoppingCart,
  Trash2,
  Truck,
  XCircle,
} from "lucide-react"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx-js-style"
import type { ApiFetch } from "../../shared/api/apiClient"
import { endpoints } from "../../shared/api/endpoints"
import { BulkActionBar as BulkToolbar } from "../../shared/components/BulkActionBar"
import { ConfirmModal as BulkConfirmModal } from "../../shared/components/ConfirmModal"
import { DownloadChoiceModal } from "../../shared/components/DownloadChoiceModal"
import { FilterPanel } from "../../shared/components/FilterPanel"
import { IconButton } from "../../shared/components/IconButton"
import { Pagination } from "../../shared/components/Pagination"
import { PriorityBadge as PriorityIndicator } from "../../shared/components/PriorityBadge"
import { SelectionCell, SelectionHeader } from "../../shared/components/TableSelection"
import {
  applyFilterConditions,
  type FilterCondition,
  type FilterField,
  type FilterMatchMode,
} from "../../shared/hooks/useFilters"
import { usePageSelection } from "../../shared/hooks/usePageSelection"
import { getPageItems } from "../../shared/hooks/usePagination"
import type { Division } from "../../shared/types/organization"
import { getTodayDate, isPastDate } from "../../shared/utils/formatDate"
import { loadLogoDataUrl } from "../../shared/utils/downloadReports"
import { isHighlightTarget } from "../../shared/utils/navigation"
import type { AuthUser } from "../auth/authTypes"
import type { Supplier } from "../suppliers/suppliersTypes"
import { PrioritySelector } from "./PrioritySelector"
import {
  createPurchaseReportPdf,
  downloadPurchaseReportXlsx,
  getPurchaseReceiveMissingFields,
} from "./PurchaseReportModal"
import type { Purchase, PurchasePriority, PurchaseStatus } from "./purchasesTypes"

const PURCHASES_API_URL = endpoints.purchases
const partCategories = [
  "Microprocessors",
  "Microcontrollers",
  "PCBs",
  "Sensors",
  "Actuators",
  "Development Boards",
  "Communication Modules",
  "Connectors",
  "Cables",
  "Power Modules",
  "Test Equipment",
  "Tools",
  "Other",
]
const divisions: Division[] = [
  "Division 1",
  "Division 2",
  "Division 3",
  "Division 4",
  "Admin",
]

function withoutSupplierName(contact: string, supplierName: string) {
  const normalizedContact = contact.trim()
  const normalizedName = supplierName.trim()
  if (!normalizedContact || !normalizedName) {
    return normalizedContact
  }
  return normalizedContact.replace(new RegExp(`^${normalizedName}\\s*[-:,]?\\s*`, "i"), "")
}
export function PurchasesPage({
  purchases,
  suppliers,
  users,
  isLoadingPurchases,
  purchasesError,
  currentUser,
  apiFetch,
  reloadPurchases,
  reloadParts,
  reloadAnalytics,
  setPurchasesError,
  highlightTarget,
  reloadNotificationSummary,
}: {
  purchases: Purchase[]
  suppliers: Supplier[]
  users: AuthUser[]
  isLoadingPurchases: boolean
  purchasesError: string | null
  currentUser: AuthUser
  apiFetch: ApiFetch
  reloadPurchases: () => Promise<void>
  reloadParts: () => Promise<void>
  reloadAnalytics: () => Promise<void>
  setPurchasesError: React.Dispatch<React.SetStateAction<string | null>>
  highlightTarget: {
    targetPage: string
    targetSection?: string
    targetId?: number
  } | null
  reloadNotificationSummary: () => Promise<void>
}) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null)
  const [bulkAction, setBulkAction] = useState<
    | "approve"
    | "order"
    | "in-transit"
    | "receive"
    | "cancel"
    | "delete"
    | "reports"
    | null
  >(null)
  const [receiveValidationErrors, setReceiveValidationErrors] = useState<
    string[]
  >([])
  const [reportPurchase, setReportPurchase] = useState<Purchase | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [dateSort, setDateSort] = useState<"latest" | "oldest">("latest")
  const [advancedFilters, setAdvancedFilters] = useState<FilterCondition[]>([])
  const [advancedMatchMode, setAdvancedMatchMode] =
    useState<FilterMatchMode>("all")
  const purchaseSaveInFlight = useRef(false)
  const isAdmin = currentUser.role === "Admin"
  const purchaseFilterFields: FilterField<Purchase>[] = [
    { key: "item", label: "Item name", type: "text", getValue: (item) => item.itemName },
    { key: "category", label: "Category", type: "select", options: partCategories, getValue: (item) => item.category },
    { key: "reference", label: "Reference", type: "text", getValue: (item) => item.reference },
    { key: "quantity", label: "Quantity", type: "number", getValue: (item) => item.quantity },
    { key: "priority", label: "Priority", type: "select", options: ["Low", "Medium", "High", "Critical"], getValue: (item) => item.priority },
    { key: "division", label: "Division", type: "select", options: divisions, getValue: (item) => item.division },
    { key: "supplier", label: "Supplier", type: "text", getValue: (item) => item.supplierName },
    { key: "status", label: "Status", type: "select", options: ["Pending", "Approved", "Ordered", "In Transit", "Received", "Cancelled"], getValue: (item) => item.status },
    { key: "arrival", label: "Expected arrival date", type: "date", getValue: (item) => item.expectedArrivalDate },
  ]
  const filteredPurchases = applyFilterConditions(
    purchases.filter((purchase) => {
      const normalizedSearch = search.trim().toLowerCase()
      const matchesSearch =
        !normalizedSearch ||
        purchase.itemName.toLowerCase().includes(normalizedSearch) ||
        purchase.reference.toLowerCase().includes(normalizedSearch) ||
        purchase.category.toLowerCase().includes(normalizedSearch) ||
        purchase.supplierName.toLowerCase().includes(normalizedSearch)
      return matchesSearch
    }),
    purchaseFilterFields,
    advancedFilters,
    advancedMatchMode
  )
    .sort((first, second) => {
      const firstTime = first.createdAt
        ? new Date(first.createdAt).getTime()
        : first.id
      const secondTime = second.createdAt
        ? new Date(second.createdAt).getTime()
        : second.id
      return dateSort === "latest"
        ? secondTime - firstTime
        : firstTime - secondTime
    })
  const paginatedPurchases = getPageItems(filteredPurchases, page)
  const purchaseSelection = usePageSelection(paginatedPurchases.items, page)
  const selectedPurchases = paginatedPurchases.items.filter((purchase) =>
    purchaseSelection.selectedIds.has(purchase.id)
  )
  const allSelectedHaveStatus = (status: PurchaseStatus) =>
    selectedPurchases.length > 0 &&
    selectedPurchases.every((purchase) => purchase.status === status)
  const canBulkCancel =
    selectedPurchases.length > 0 &&
    selectedPurchases.every((purchase) =>
      isAdmin
        ? ["Pending", "Approved", "Ordered", "In Transit"].includes(
            purchase.status
          )
        : purchase.requestedById === currentUser.id &&
          purchase.status === "Pending"
    )
  const getCreatedBy = (purchase: Purchase) =>
    users.find((user) => user.id === purchase.requestedById)?.name ||
    `User #${purchase.requestedById}`
  const isPurchaseCreatedByAdmin = (purchase: Purchase) =>
    users.find((user) => user.id === purchase.requestedById)?.role === "Admin" ||
    (purchase.requestedById === currentUser.id && isAdmin)

  useEffect(() => {
    setPage(1)
  }, [search, dateSort, advancedFilters, advancedMatchMode])

  async function savePurchase(input: Partial<Purchase>) {
    if (purchaseSaveInFlight.current) {
      return
    }

    purchaseSaveInFlight.current = true
    try {
      setPurchasesError(null)
      const response = await apiFetch(
        editingPurchase
          ? `${PURCHASES_API_URL}/${editingPurchase.id}`
          : PURCHASES_API_URL,
        {
          method: editingPurchase ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(input),
        }
      )

      if (!response.ok) {
        throw new Error("Failed to save purchase")
      }

      setIsModalOpen(false)
      setEditingPurchase(null)
      setReceiveValidationErrors([])
      await reloadPurchases()
      await reloadNotificationSummary()
    } catch {
      setPurchasesError("Failed to save purchase request")
    } finally {
      purchaseSaveInFlight.current = false
    }
  }

  async function updateStatus(
    id: number,
    action: "approve" | "order" | "in-transit" | "receive" | "cancel"
  ) {
    const purchase = purchases.find((item) => item.id === id)
    if (action === "receive" && purchase) {
      const missingFields = getPurchaseReceiveMissingFields(purchase)
      if (missingFields.length > 0) {
        setReceiveValidationErrors(missingFields)
        setEditingPurchase(purchase)
        setIsModalOpen(true)
        return
      }
    }

    try {
      setPurchasesError(null)
      const response = await apiFetch(`${PURCHASES_API_URL}/${id}/${action}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        throw new Error("Failed to update purchase")
      }

      await reloadPurchases()
      await reloadParts()
      await reloadAnalytics()
      await reloadNotificationSummary()
    } catch {
      setPurchasesError("Failed to update purchase status")
    }
  }

  async function deletePurchase(id: number) {
    try {
      setPurchasesError(null)
      const response = await apiFetch(`${PURCHASES_API_URL}/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete purchase")
      }

      await reloadPurchases()
      await reloadNotificationSummary()
    } catch {
      setPurchasesError("Failed to delete purchase")
    }
  }

  async function handleBulkPurchaseAction() {
    if (!bulkAction) {
      return
    }

    if (bulkAction === "reports") {
      const doc = await createPurchaseReportPdf(selectedPurchases, getCreatedBy)
      doc.save(`purchase-reports-${getTodayDate()}.pdf`)
      setBulkAction(null)
      return
    }

    const eligible = selectedPurchases.filter((purchase) => {
      if (bulkAction === "approve") {
        return (
          isAdmin &&
          purchase.status === "Pending" &&
          !isPurchaseCreatedByAdmin(purchase) &&
          purchase.requestedById !== currentUser.id
        )
      }
      if (bulkAction === "order") {
        return (
          isAdmin &&
          (purchase.status === "Approved" ||
            (purchase.status === "Pending" &&
              isPurchaseCreatedByAdmin(purchase)))
        )
      }
      if (bulkAction === "in-transit") {
        return isAdmin && purchase.status === "Ordered"
      }
      if (bulkAction === "receive") {
        return isAdmin && purchase.status === "In Transit"
      }
      if (bulkAction === "delete") return isAdmin
      return canBulkCancel
    })

    try {
      setPurchasesError(null)
      if (eligible.length === 0) {
        throw new Error("No eligible purchases selected")
      }
      if (bulkAction === "receive") {
        const incompletePurchase = eligible.find(
          (purchase) => getPurchaseReceiveMissingFields(purchase).length > 0
        )
        if (incompletePurchase) {
          setReceiveValidationErrors(
            getPurchaseReceiveMissingFields(incompletePurchase)
          )
          setEditingPurchase(incompletePurchase)
          setIsModalOpen(true)
          setBulkAction(null)
          return
        }
      }
      const responses = await Promise.all(
        eligible.map((purchase) =>
          apiFetch(
            bulkAction === "delete"
              ? `${PURCHASES_API_URL}/${purchase.id}`
              : `${PURCHASES_API_URL}/${purchase.id}/${bulkAction}`,
            {
              method: bulkAction === "delete" ? "DELETE" : "PUT",
              ...(bulkAction === "delete"
                ? {}
                : {
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({}),
                  }),
            }
          )
        )
      )
      if (responses.some((response) => !response.ok)) {
        throw new Error("Failed to update selected purchases")
      }
      await reloadPurchases()
      await reloadParts()
      await reloadAnalytics()
      await reloadNotificationSummary()
      purchaseSelection.clear()
      setBulkAction(null)
    } catch {
      setPurchasesError("Failed to update selected purchases")
    }
  }

  async function downloadPurchasePdf(purchase: Purchase) {
    const doc = await createPurchaseReportPdf([purchase], getCreatedBy)
    doc.save(`purchase-report-${purchase.id}.pdf`)
  }

  async function exportPurchaseListPdf() {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
    try {
      const logo = await loadLogoDataUrl()
      doc.addImage(logo, "PNG", 14, 8, 42, 13)
    } catch {
      // The export remains usable if the logo cannot be loaded.
    }
    doc.setFontSize(18)
    doc.text("Purchase List", 14, 30)
    autoTable(doc, {
      startY: 36,
      head: [[
        "ID",
        "Item",
        "Category",
        "Reference",
        "Qty",
        "Criticality",
        "Division",
        "Supplier",
        "Total",
        "Arrival",
        "Status",
      ]],
      body: filteredPurchases.map((purchase) => [
        purchase.id,
        purchase.itemName,
        purchase.category,
        purchase.reference || "-",
        purchase.quantity,
        purchase.priority,
        purchase.division,
        purchase.supplierName || "-",
        purchase.totalPrice,
        purchase.expectedArrivalDate || "-",
        purchase.status,
      ]),
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [31, 41, 55] },
    })
    doc.save(`purchase-list-${getTodayDate()}.pdf`)
  }

  function exportPurchaseListXlsx() {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredPurchases.map((purchase) => ({
        ID: purchase.id,
        Item: purchase.itemName,
        Category: purchase.category,
        Manufacturer: purchase.manufacturer,
        Reference: purchase.reference,
        Quantity: purchase.quantity,
        Criticality: purchase.priority,
        Division: purchase.division,
        Supplier: purchase.supplierName,
        "Supplier contact": purchase.supplierContact,
        "Unit price": purchase.unitPrice,
        "Total price": purchase.totalPrice,
        "Expected arrival": purchase.expectedArrivalDate,
        "Received date": purchase.receivedDate,
        Status: purchase.status,
        Reason: purchase.reason,
        "Admin comment": purchase.adminComment,
        "Created by": getCreatedBy(purchase),
        "Created at": purchase.createdAt,
        "Updated at": purchase.updatedAt,
      }))
    )
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Purchases")
    XLSX.writeFile(workbook, `purchase-list-${getTodayDate()}.xlsx`)
  }

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold">Purchase</h2>
          <p className="text-gray-500">
            Request and receive needed electronic parts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportPurchaseListPdf}
            className="inline-flex items-center gap-2 rounded border px-4 py-2 font-semibold"
          >
            <FileText className="h-4 w-4" />
            Export PDF
          </button>
          <button
            onClick={exportPurchaseListXlsx}
            className="inline-flex items-center gap-2 rounded border px-4 py-2 font-semibold"
          >
            <Download className="h-4 w-4" />
            Export XLSX
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="rounded bg-yellow-400 px-4 py-2 font-semibold text-black"
          >
            + Purchase Request
          </button>
        </div>
      </div>

      <div
        id="PurchaseRequests"
        className={`overflow-x-auto rounded-lg bg-white p-6 shadow ${isHighlightTarget(highlightTarget, "Purchase", "PurchaseRequests")
          ? "ring-4 ring-yellow-300"
          : ""
          }`}
      >
        {isLoadingPurchases && (
          <div className="mb-6 rounded border border-gray-200 bg-gray-50 px-4 py-3 text-gray-600">
            Loading purchases...
          </div>
        )}
        {purchasesError && (
          <div className="mb-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {purchasesError}
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search item, reference, category, supplier..."
              className="min-w-0 flex-1 rounded border border-gray-300 px-4 py-2 sm:w-[300px] sm:flex-none"
            />
            <FilterPanel
              fields={purchaseFilterFields}
              conditions={advancedFilters}
              matchMode={advancedMatchMode}
              onApply={(conditions, mode) => {
                setAdvancedFilters(conditions)
                setAdvancedMatchMode(mode)
              }}
            />
          </div>
          <select
            value={dateSort}
            onChange={(event) =>
              setDateSort(event.target.value as "latest" | "oldest")
            }
            className="rounded border border-gray-300 bg-white px-4 py-2"
          >
            <option value="latest">Latest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
        <BulkToolbar count={purchaseSelection.selectedCount}>
          {isAdmin &&
            allSelectedHaveStatus("Pending") &&
            selectedPurchases.every(
              (purchase) =>
                !isPurchaseCreatedByAdmin(purchase) &&
                purchase.requestedById !== currentUser.id
            ) && (
            <button
              onClick={() => setBulkAction("approve")}
              className="rounded bg-green-600 px-3 py-2 text-sm font-semibold text-white"
            >
              Approve selected
            </button>
          )}
          {isAdmin &&
            selectedPurchases.length > 0 &&
            selectedPurchases.every(
              (purchase) =>
                purchase.status === "Approved" ||
                (purchase.status === "Pending" &&
                  isPurchaseCreatedByAdmin(purchase))
            ) && (
            <button
              onClick={() => setBulkAction("order")}
              className="rounded bg-yellow-400 px-3 py-2 text-sm font-semibold text-black"
            >
              Order selected
            </button>
          )}
          {isAdmin && allSelectedHaveStatus("Ordered") && (
            <button
              onClick={() => setBulkAction("in-transit")}
              className="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
            >
              Mark In Transit selected
            </button>
          )}
          {isAdmin && allSelectedHaveStatus("In Transit") && (
            <button
              onClick={() => setBulkAction("receive")}
              className="rounded bg-green-600 px-3 py-2 text-sm font-semibold text-white"
            >
              Mark Received selected
            </button>
          )}
          {allSelectedHaveStatus("Received") && (
            <button
              onClick={() => setBulkAction("reports")}
              className="rounded bg-gray-900 px-3 py-2 text-sm font-semibold text-white"
            >
              Download Reports PDF
            </button>
          )}
          {canBulkCancel && (
            <button
              onClick={() => setBulkAction("cancel")}
              className="rounded bg-gray-700 px-3 py-2 text-sm font-semibold text-white"
            >
              Cancel selected
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setBulkAction("delete")}
              className="rounded bg-red-600 px-3 py-2 text-sm font-semibold text-white"
            >
              Delete selected
            </button>
          )}
        </BulkToolbar>

        <table className="w-full min-w-[1180px]">
          <thead>
            <tr className="border-b bg-gray-100">
              <SelectionHeader
                checked={purchaseSelection.allSelected}
                onChange={purchaseSelection.toggleAll}
              />
              <th className="px-2 py-3 text-left">Item</th>
              <th className="px-2 py-3 text-left">Category</th>
              <th className="px-2 py-3 text-left">Reference</th>
              <th className="px-2 py-3 text-left">Quantity</th>
              <th className="px-2 py-3 text-left">Criticality</th>
              <th className="px-2 py-3 text-left">Division</th>
              <th className="px-2 py-3 text-left">Status</th>
              <th className="px-2 py-3 text-left">Supplier</th>
              <th className="px-2 py-3 text-left">Expected Arrival</th>
              <th className="px-2 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedPurchases.items.map((purchase) => (
              (() => {
                const isOwner = purchase.requestedById === currentUser.id
                const isAdminCreated = isPurchaseCreatedByAdmin(purchase)
                const canEdit =
                  (isAdmin &&
                    ["Pending", "Approved", "Ordered", "In Transit"].includes(
                      purchase.status
                    )) ||
                  (!isAdmin &&
                    isOwner &&
                    purchase.status === "Pending")
                const canCancel =
                  (isAdmin &&
                    ["Pending", "Approved", "Ordered", "In Transit"].includes(
                      purchase.status
                    )) ||
                  (!isAdmin && isOwner && purchase.status === "Pending")
                const canDelete = isAdmin

                return (
                  <tr
                    id={`PurchaseRequests-${purchase.id}`}
                    key={purchase.id}
                    className={`border-b hover:bg-gray-50 ${
                      purchaseSelection.selectedIds.has(purchase.id)
                        ? "bg-yellow-50"
                        : ""
                    } ${isHighlightTarget(
                      highlightTarget,
                      "Purchase",
                      "PurchaseRequests",
                      purchase.id
                    )
                      ? "bg-yellow-100"
                      : ""
                      }`}
                  >
                    <SelectionCell
                      checked={purchaseSelection.selectedIds.has(purchase.id)}
                      onChange={() => purchaseSelection.toggle(purchase.id)}
                      label={`Select purchase ${purchase.itemName}`}
                    />
                    <td className="px-2 py-3 font-medium">{purchase.itemName}</td>
                    <td className="px-2 py-3">{purchase.category}</td>
                    <td className="px-2 py-3">{purchase.reference || "-"}</td>
                    <td className="px-2 py-3">{purchase.quantity}</td>
                    <td className="px-2 py-3">
                      <PriorityIndicator priority={purchase.priority} />
                    </td>
                    <td className="px-2 py-3">{purchase.division}</td>
                    <td className="px-2 py-3">
                      <PurchaseStatusBadge status={purchase.status} />
                    </td>
                    <td className="px-2 py-3">{purchase.supplierName || "-"}</td>
                    <td className="px-2 py-3">
                      {purchase.expectedArrivalDate || "-"}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex flex-wrap gap-2">
                        {canEdit && (
                          <IconButton
                            icon={<Pencil className="h-4 w-4" />}
                            label="Edit purchase"
                            onClick={() => {
                              setEditingPurchase(purchase)
                              setIsModalOpen(true)
                            }}
                            tone="blue"
                          />
                        )}
                        {isAdmin &&
                          purchase.status === "Pending" &&
                          !isAdminCreated &&
                          !isOwner && (
                          <IconButton
                            icon={<CheckCircle className="h-4 w-4" />}
                            label="Approve purchase"
                            onClick={() => updateStatus(purchase.id, "approve")}
                            tone="green"
                          />
                        )}
                        {isAdmin &&
                          (purchase.status === "Approved" ||
                            (purchase.status === "Pending" &&
                              isAdminCreated)) && (
                          <IconButton
                            icon={<ShoppingCart className="h-4 w-4" />}
                            label="Order purchase"
                            onClick={() => updateStatus(purchase.id, "order")}
                            tone="yellow"
                          />
                        )}
                        {isAdmin && purchase.status === "Ordered" && (
                          <IconButton
                            icon={<Truck className="h-4 w-4" />}
                            label="Mark purchase in transit"
                            onClick={() => updateStatus(purchase.id, "in-transit")}
                            tone="blue"
                          />
                        )}
                        {isAdmin && purchase.status === "In Transit" && (
                          <IconButton
                            icon={<ClipboardCheck className="h-4 w-4" />}
                            label="Mark purchase received"
                            onClick={() => updateStatus(purchase.id, "receive")}
                            tone="green"
                          />
                        )}
                        {canCancel && (
                          <IconButton
                            icon={<XCircle className="h-4 w-4" />}
                            label="Cancel purchase"
                            onClick={() => updateStatus(purchase.id, "cancel")}
                            tone="neutral"
                          />
                        )}
                        {purchase.status === "Received" && (
                          <IconButton
                            icon={<Download className="h-4 w-4" />}
                            label="Download purchase report"
                            onClick={() => setReportPurchase(purchase)}
                            tone="green"
                          />
                        )}
                        {canDelete && (
                          <IconButton
                            icon={<Trash2 className="h-4 w-4" />}
                            label="Delete purchase"
                            onClick={() => deletePurchase(purchase.id)}
                            tone="red"
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })()
            ))}
            {filteredPurchases.length === 0 && (
              <tr>
                <td colSpan={11} className="py-8 text-center text-gray-500">
                  No purchase requests match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination
          page={paginatedPurchases.page}
          totalPages={paginatedPurchases.totalPages}
          start={paginatedPurchases.start}
          end={paginatedPurchases.end}
          total={paginatedPurchases.total}
          onPageChange={setPage}
        />
      </div>

      {isModalOpen && (
        <PurchaseModal
          purchase={editingPurchase}
          suppliers={suppliers}
          currentUser={currentUser}
          onClose={() => {
            setIsModalOpen(false)
            setEditingPurchase(null)
            setReceiveValidationErrors([])
          }}
          onSave={savePurchase}
          validationErrors={receiveValidationErrors}
        />
      )}
      {bulkAction && (
        <BulkConfirmModal
          title={`${bulkAction === "in-transit" ? "Mark In Transit" : bulkAction === "receive" ? "Mark Received" : bulkAction === "reports" ? "Download reports for" : `${bulkAction[0].toUpperCase()}${bulkAction.slice(1)}`} purchases`}
          message={`${bulkAction === "reports" ? "Generate a combined PDF for" : "Apply this action to"} ${purchaseSelection.selectedCount} selected purchases?`}
          confirmLabel={
            bulkAction === "reports"
              ? "Download reports"
              : bulkAction === "in-transit"
                ? "Mark In Transit"
                : bulkAction === "receive"
                  ? "Mark Received"
                  : `${bulkAction[0].toUpperCase()}${bulkAction.slice(1)} selected`
          }
          tone={
            bulkAction === "approve" || bulkAction === "receive"
              ? "green"
              : bulkAction === "order" || bulkAction === "reports"
                ? "yellow"
                : "red"
          }
          onClose={() => setBulkAction(null)}
          onConfirm={handleBulkPurchaseAction}
        />
      )}
      {reportPurchase && (
        <DownloadChoiceModal
          title="Download Purchase Report"
          onClose={() => setReportPurchase(null)}
          onDownloadPdf={async () => {
            await downloadPurchasePdf(reportPurchase)
            setReportPurchase(null)
          }}
          onDownloadXlsx={() => {
            downloadPurchaseReportXlsx(
              reportPurchase,
              getCreatedBy(reportPurchase)
            )
            setReportPurchase(null)
          }}
        />
      )}
    </>
  )
}

function PurchaseStatusBadge({ status }: { status: PurchaseStatus }) {
  const classes =
    status === "Received"
      ? "bg-green-100 text-green-800"
      : status === "Cancelled"
        ? "bg-red-100 text-red-800"
        : status === "Ordered" || status === "In Transit"
          ? "bg-blue-100 text-blue-800"
          : status === "Approved"
            ? "bg-purple-100 text-purple-800"
            : "bg-yellow-100 text-yellow-800"

  return (
    <span className={`rounded-full px-3 py-1 text-sm font-semibold ${classes}`}>
      {status}
    </span>
  )
}

function PurchaseModal({
  purchase,
  suppliers,
  currentUser,
  onClose,
  onSave,
  validationErrors = [],
}: {
  purchase: Purchase | null
  suppliers: Supplier[]
  currentUser: AuthUser
  onClose: () => void
  onSave: (purchase: Partial<Purchase>) => void
  validationErrors?: string[]
}) {
  const [form, setForm] = useState({
    itemName: purchase?.itemName || "",
    category: purchase?.category || partCategories[0],
    manufacturer: purchase?.manufacturer || "",
    reference: purchase?.reference || "",
    quantity: purchase?.quantity || 1,
    reason: purchase?.reason || "",
    priority: purchase?.priority || ("Medium" as PurchasePriority),
    division:
      purchase?.division ||
      currentUser.managedDivision ||
      currentUser.division ||
      ("Division 1" as Division),
    supplierName: purchase?.supplierName || "",
    supplierContact: withoutSupplierName(
      purchase?.supplierContact || "",
      purchase?.supplierName || ""
    ),
    unitPrice: purchase?.unitPrice || 0,
    totalPrice: purchase?.totalPrice || 0,
    expectedArrivalDate: purchase?.expectedArrivalDate || "",
    adminComment: purchase?.adminComment || "",
  })
  const isAdmin = currentUser.role === "Admin"
  const isOwner = purchase?.requestedById === currentUser.id
  const isAdminEditableStatus =
    !purchase ||
    ["Pending", "Approved", "Ordered", "In Transit"].includes(purchase.status)
  const isManagerEditableStatus =
    !purchase || (isOwner && purchase.status === "Pending")
  const canEditCoreIdentity =
    !purchase?.sourcePartId &&
    (!purchase || (isAdmin && isAdminEditableStatus))
  const canEditQuantity =
    !purchase ||
    (isAdmin && isAdminEditableStatus) ||
    (!isAdmin && isManagerEditableStatus)
  const canEditReasonPriority =
    !purchase ||
    (isAdmin && isAdminEditableStatus) ||
    (!isAdmin && isManagerEditableStatus)
  const canEditAdminFields = isAdmin && isAdminEditableStatus
  const hasInvalidQuantity = form.quantity <= 0
  const hasPastExpectedArrivalDate = isPastDate(form.expectedArrivalDate)

  function updateField(field: keyof typeof form, value: string | number) {
    const nextForm = { ...form, [field]: value }
    if (field === "quantity" || field === "unitPrice") {
      nextForm.totalPrice =
        Number(nextForm.quantity || 0) * Number(nextForm.unitPrice || 0)
    }
    setForm(nextForm)
  }

  function handleSupplierChange(supplierName: string) {
    const supplier = suppliers.find((item) => item.name === supplierName)
    setForm({
      ...form,
      supplierName,
      supplierContact: supplier
        ? [supplier.contactPerson, supplier.email, supplier.phone]
          .filter(Boolean)
          .join(" / ")
        : "",
    })
  }

  function submitPurchase() {
    if (isAdmin || !purchase) {
      onSave(form)
      return
    }

    onSave({
      quantity: form.quantity,
      reason: form.reason,
      priority: form.priority,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-2xl font-bold">
          {purchase ? "Edit Purchase Request" : "New Purchase Request"}
        </h3>
        {validationErrors.length > 0 && (
          <div className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            <p className="font-semibold">
              Complete these fields before marking the purchase Received:
            </p>
            <ul className="mt-2 list-disc pl-5 text-sm">
              {validationErrors.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-semibold text-gray-700">Item name</span>
            <input
              value={form.itemName}
              onChange={(event) => updateField("itemName", event.target.value)}
              readOnly={!canEditCoreIdentity}
              className="w-full rounded border px-4 py-2 read-only:cursor-not-allowed read-only:bg-gray-100 read-only:text-gray-600"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-semibold text-gray-700">Category</span>
            <select
              value={form.category}
              onChange={(event) => updateField("category", event.target.value)}
              disabled={!canEditCoreIdentity}
              className="w-full rounded border px-4 py-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-600"
            >
              {partCategories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-sm font-semibold text-gray-700">
              Manufacturer
            </span>
            <input
              value={form.manufacturer}
              onChange={(event) => updateField("manufacturer", event.target.value)}
              readOnly={!canEditCoreIdentity}
              className="w-full rounded border px-4 py-2 read-only:cursor-not-allowed read-only:bg-gray-100 read-only:text-gray-600"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-semibold text-gray-700">Reference</span>
            <input
              value={form.reference}
              onChange={(event) => updateField("reference", event.target.value)}
              readOnly={!canEditCoreIdentity}
              className="w-full rounded border px-4 py-2 read-only:cursor-not-allowed read-only:bg-gray-100 read-only:text-gray-600"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-semibold text-gray-700">
              Quantity requested
            </span>
            <input
              type="number"
              min={1}
              value={form.quantity}
              readOnly={!canEditQuantity}
              onChange={(event) =>
                updateField("quantity", Number(event.target.value))
              }
              className="w-full rounded border px-4 py-2 read-only:cursor-not-allowed read-only:bg-gray-100 read-only:text-gray-600"
            />
          </label>
          <div className="space-y-2">
            <span className="text-sm font-semibold text-gray-700">
              Criticality
            </span>
            <PrioritySelector
              value={form.priority}
              disabled={!canEditReasonPriority}
              onChange={(priority) =>
                updateField("priority", priority)
              }
            />
          </div>
          {canEditAdminFields && (
            <label className="space-y-1">
              <span className="text-sm font-semibold text-gray-700">Division</span>
              <select
                value={form.division}
                onChange={(event) =>
                  updateField("division", event.target.value as Division)
                }
                className="w-full rounded border px-4 py-2"
              >
                {divisions.map((divisionName) => (
                  <option key={divisionName}>{divisionName}</option>
                ))}
              </select>
            </label>
          )}
          {canEditAdminFields && (
            <>
              <label className="space-y-1">
                <span className="text-sm font-semibold text-gray-700">
                  Supplier
                </span>
                <select
                  value={form.supplierName}
                  onChange={(event) => handleSupplierChange(event.target.value)}
                  className="w-full rounded border px-4 py-2"
                >
                  <option value="">No supplier selected yet</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.name}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-sm font-semibold text-gray-700">
                  Supplier contact
                </span>
                <input
                  value={form.supplierContact}
                  onChange={(event) =>
                    updateField("supplierContact", event.target.value)
                  }
                  className="w-full rounded border px-4 py-2"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-semibold text-gray-700">
                  Unit price
                </span>
                <input
                  type="number"
                  min={0}
                  value={form.unitPrice}
                  onChange={(event) =>
                    updateField("unitPrice", Number(event.target.value))
                  }
                  className="w-full rounded border px-4 py-2"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-semibold text-gray-700">
                  Total price
                </span>
                <input
                  type="number"
                  min={0}
                  value={form.totalPrice}
                  onChange={(event) =>
                    updateField("totalPrice", Number(event.target.value))
                  }
                  className="w-full rounded border px-4 py-2"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-semibold text-gray-700">
                  Expected arrival date
                </span>
                <input
                  type="date"
                  min={getTodayDate()}
                  value={form.expectedArrivalDate}
                  onChange={(event) =>
                    updateField("expectedArrivalDate", event.target.value)
                  }
                  className="w-full rounded border px-4 py-2"
                />
              </label>
            </>
          )}
          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm font-semibold text-gray-700">
              Request reason
            </span>
            <textarea
              value={form.reason}
              onChange={(event) => updateField("reason", event.target.value)}
              readOnly={!canEditReasonPriority}
              className="min-h-24 w-full rounded border px-4 py-2 read-only:cursor-not-allowed read-only:bg-gray-100 read-only:text-gray-600"
            />
          </label>
          {canEditAdminFields && (
            <label className="space-y-1 sm:col-span-2">
              <span className="text-sm font-semibold text-gray-700">
                Admin comment
              </span>
              <textarea
                value={form.adminComment}
                onChange={(event) =>
                  updateField("adminComment", event.target.value)
                }
                className="min-h-20 w-full rounded border px-4 py-2"
              />
            </label>
          )}
        </div>

        {hasInvalidQuantity && (
          <p className="mt-3 text-sm text-red-600">
            Quantity must be greater than 0
          </p>
        )}
        {hasPastExpectedArrivalDate && (
          <p className="mt-3 text-sm text-red-600">
            Date cannot be in the past
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded border px-4 py-2">
            Cancel
          </button>
          <button
            onClick={submitPurchase}
            disabled={
              !form.itemName ||
              !form.category ||
              !form.reason ||
              hasInvalidQuantity ||
              hasPastExpectedArrivalDate
            }
            className="rounded bg-yellow-400 px-4 py-2 font-semibold text-black disabled:opacity-60"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

