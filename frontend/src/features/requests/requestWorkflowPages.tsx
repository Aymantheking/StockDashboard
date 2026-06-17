import { useEffect, useState } from "react"
import {
  CheckCircle,
  ClipboardCheck,
  Eye,
  FileText,
  RotateCcw,
  XCircle,
} from "lucide-react"
import { BulkActionBar as BulkToolbar } from "../../shared/components/BulkActionBar"
import { ConfirmModal as BulkConfirmModal } from "../../shared/components/ConfirmModal"
import { FilterPanel } from "../../shared/components/FilterPanel"
import { IconButton } from "../../shared/components/IconButton"
import { Pagination } from "../../shared/components/Pagination"
import { TableTextCell as TextCell } from "../../shared/components/TableTextCell"
import { SelectionCell, SelectionHeader } from "../../shared/components/TableSelection"
import {
  applyFilterConditions,
  type FilterCondition,
  type FilterField,
  type FilterMatchMode,
} from "../../shared/hooks/useFilters"
import { usePageSelection } from "../../shared/hooks/usePageSelection"
import { getPageItems } from "../../shared/hooks/usePagination"
import { formatRequestedAt, getTodayDate, isPastDate } from "../../shared/utils/formatDate"
import { isHighlightTarget } from "../../shared/utils/navigation"
import type { CollaboratorGroup, Division } from "../../shared/types/organization"
import type { Collaborator } from "../collaborators/collaboratorsTypes"
import type { Part } from "../inventory/inventoryTypes"
import type { Reservation } from "../reservations/reservationsTypes"
import type {
  MissingItemRequest,
  PartRequest,
  RequestDetailsItem,
  RequestStatus,
} from "./requestsTypes"
import { requestApi } from "../../services/api/requestApi"

const divisions: Division[] = ["Division 1", "Division 2", "Division 3", "Division 4", "Admin"]
const collaboratorGroups: CollaboratorGroup[] = ["Group 1", "Group 2", "Group 3", "Group 4"]
export const missingItemCategories = [
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

type MissingItemRequestInput = {
  partId?: number | null
  itemName: string
  category: string
  manufacturer: string
  reference: string
  quantityNeeded: number
  reason: string
  neededDate: string
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object" &&
    (error as { response?: unknown }).response !== null
  ) {
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

function getRequestStartDate(request: PartRequest) {
  return request.requestType === "Reservation"
    ? request.usageDate || request.expectedReturnDate
    : request.startDate || "-"
}

function getRequestDueDate(request: PartRequest) {
  return request.requestType === "Reservation"
    ? request.usageDate || request.expectedReturnDate
    : request.dueDate || request.expectedReturnDate
}

function sortWorkflowRequests<
  T extends { id: number; status: RequestStatus; createdAt?: string },
>(requests: T[]) {
  const statusRank = (status: RequestStatus) =>
    status === "Pending" ? 0 : status === "Return Pending" ? 1 : 2

  return [...requests].sort((a, b) => {
    const rankDifference = statusRank(a.status) - statusRank(b.status)
    if (rankDifference !== 0) {
      return rankDifference
    }

    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : a.id
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : b.id

    return a.status === "Pending" ? aTime - bTime : bTime - aTime
  })
}

function hasReturnReport(request: PartRequest) {
  return Boolean(
    request.returnDeclaredAt ||
    request.returnConfirmedAt ||
    request.status === "Return Pending" ||
    request.status === "Returned" ||
    request.status === "Damaged"
  )
}

function isMissingItemRequest(
  request: RequestDetailsItem
): request is MissingItemRequest {
  return "itemName" in request
}

export function RequestsPage({
  partRequests,
  missingItemRequests,
  isLoadingRequests,
  requestsError,
  reloadParts,
  reloadPurchases,
  reloadRequests,
  reloadAnalytics,
  setRequestsError,
  canApproveRequests,
  highlightTarget,
  reloadNotificationSummary,
}: {
  partRequests: PartRequest[]
  missingItemRequests: MissingItemRequest[]
  isLoadingRequests: boolean
  requestsError: string | null
  reloadParts: () => Promise<void>
  reloadPurchases: () => Promise<void>
  reloadRequests: () => Promise<void>
  reloadAnalytics: () => Promise<void>
  setRequestsError: React.Dispatch<React.SetStateAction<string | null>>
  canApproveRequests: boolean
  highlightTarget: {
    targetPage: string
    targetSection?: string
    targetId?: number
  } | null
  reloadNotificationSummary: () => Promise<void>
}) {
  const [pendingPartAction, setPendingPartAction] = useState<{
    id: number
    action: "approve" | "reject" | "return" | "mark-damaged"
  } | null>(null)
  const [pendingMissingAction, setPendingMissingAction] = useState<{
    id: number
    action: "approve" | "reject"
  } | null>(null)
  const [confirmingReturnRequest, setConfirmingReturnRequest] =
    useState<PartRequest | null>(null)
  const [viewingReturnReport, setViewingReturnReport] =
    useState<PartRequest | null>(null)
  const [viewingRequestDetails, setViewingRequestDetails] =
    useState<RequestDetailsItem | null>(null)
  const [bulkRequestAction, setBulkRequestAction] = useState<{
    target: "part" | "missing"
    action: "approve" | "reject"
  } | null>(null)
  const [partPage, setPartPage] = useState(1)
  const [missingPage, setMissingPage] = useState(1)
  const [search, setSearch] = useState("")
  const [dateSort, setDateSort] = useState<"oldest" | "latest">("oldest")
  const [advancedFilters, setAdvancedFilters] = useState<FilterCondition[]>([])
  const [advancedMatchMode, setAdvancedMatchMode] =
    useState<FilterMatchMode>("all")
  const normalizedSearch = search.trim().toLowerCase()
  const requestFilterFields: FilterField<PartRequest | MissingItemRequest>[] = [
    { key: "collaborator", label: "Collaborator", type: "text", getValue: (item) => item.collaborator?.name },
    { key: "part", label: "Part", type: "text", getValue: (item) => "itemName" in item ? `${item.itemName} ${item.reference}` : `${item.part?.name || ""} ${item.part?.reference || ""}` },
    { key: "type", label: "Type", type: "select", options: ["Reservation", "Borrow", "Missing Item"], getValue: (item) => "itemName" in item ? "Missing Item" : item.requestType },
    { key: "quantity", label: "Quantity", type: "number", getValue: (item) => "quantityNeeded" in item ? item.quantityNeeded : item.quantity },
    { key: "requestedAt", label: "Requested At", type: "date", getValue: (item) => item.createdAt },
    { key: "date", label: "Start / Usage Date", type: "date", getValue: (item) => "neededDate" in item ? item.neededDate : item.startDate || item.usageDate },
    { key: "dueDate", label: "Due Date", type: "date", getValue: (item) => "neededDate" in item ? item.neededDate : item.dueDate },
    { key: "status", label: "Status", type: "select", options: ["Pending", "Return Pending"], getValue: (item) => item.status },
    { key: "division", label: "Division", type: "select", options: divisions, getValue: (item) => item.collaborator?.division },
    { key: "group", label: "Group", type: "select", options: collaboratorGroups, getValue: (item) => item.collaborator?.group },
  ]
  const sortByRequestedAt = <
    T extends { id: number; status: RequestStatus; createdAt?: string },
  >(
    items: T[]
  ) =>
    [...items].sort((first, second) => {
      const firstRank = first.status === "Pending" ? 0 : 1
      const secondRank = second.status === "Pending" ? 0 : 1
      if (firstRank !== secondRank) {
        return firstRank - secondRank
      }

      const firstTime = first.createdAt
        ? new Date(first.createdAt).getTime()
        : first.id
      const secondTime = second.createdAt
        ? new Date(second.createdAt).getTime()
        : second.id
      return dateSort === "oldest"
        ? firstTime - secondTime
        : secondTime - firstTime
    })
  const sortedPartRequests = sortByRequestedAt(
    applyFilterConditions(partRequests.filter((request) => {
      const isActionable =
        request.status === "Pending" || request.status === "Return Pending"
      const matchesSearch =
        !normalizedSearch ||
        (request.collaborator?.name || "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        (request.part?.name || "").toLowerCase().includes(normalizedSearch) ||
        (request.part?.reference || "").toLowerCase().includes(normalizedSearch)
      return isActionable && matchesSearch
    }), requestFilterFields, advancedFilters, advancedMatchMode)
  )
  const sortedMissingItemRequests = sortByRequestedAt(
    applyFilterConditions(missingItemRequests.filter((request) => {
      const matchesSearch =
        !normalizedSearch ||
        (request.collaborator?.name || "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        request.itemName.toLowerCase().includes(normalizedSearch) ||
        request.reference.toLowerCase().includes(normalizedSearch)
      return request.status === "Pending" && matchesSearch
    }), requestFilterFields, advancedFilters, advancedMatchMode)
  )
  const paginatedPartRequests = getPageItems(sortedPartRequests, partPage)
  const paginatedMissingRequests = getPageItems(
    sortedMissingItemRequests,
    missingPage
  )
  const partRequestSelection = usePageSelection(
    paginatedPartRequests.items,
    partPage
  )
  const missingRequestSelection = usePageSelection(
    paginatedMissingRequests.items,
    missingPage
  )

  useEffect(() => {
    setPartPage(1)
    setMissingPage(1)
  }, [search, dateSort, advancedFilters, advancedMatchMode])

  async function handlePartRequestAction(
    id: number,
    action: "approve" | "reject" | "return" | "mark-damaged",
    managerComment = ""
  ) {
    try {
      setRequestsError(null)

      await requestApi.action(id, action, managerComment)

      await reloadRequests()
      await reloadParts()
      await reloadAnalytics()
      await reloadNotificationSummary()
      setPendingPartAction(null)
      setViewingRequestDetails(null)
    } catch {
      setRequestsError("Failed to update request")
    }
  }

  async function handleMissingItemAction(
    id: number,
    action: "approve" | "reject",
    managerComment = ""
  ) {
    try {
      setRequestsError(null)

      await requestApi.missingAction(id, action, managerComment)

      await reloadRequests()
      await reloadPurchases()
      await reloadNotificationSummary()
      setPendingMissingAction(null)
      setViewingRequestDetails(null)
    } catch {
      setRequestsError("Failed to update missing item request")
    }
  }

  async function handleConfirmReturn(input: {
    confirmedGoodQuantity: number
    confirmedDamagedQuantity: number
    managerComment: string
  }) {
    if (!confirmingReturnRequest) {
      return
    }

    try {
      setRequestsError(null)

      await requestApi.confirmReturn(confirmingReturnRequest.id, input)

      await reloadRequests()
      await reloadParts()
      await reloadAnalytics()
      await reloadNotificationSummary()
      setConfirmingReturnRequest(null)
    } catch {
      setRequestsError("Failed to confirm return")
    }
  }

  async function handleBulkRequestAction(managerComment: string) {
    if (!bulkRequestAction) {
      return
    }

    const selection =
      bulkRequestAction.target === "part"
        ? partRequestSelection
        : missingRequestSelection
    const pageItems =
      bulkRequestAction.target === "part"
        ? paginatedPartRequests.items
        : paginatedMissingRequests.items
    const ids = pageItems
      .filter(
        (request) =>
          request.status === "Pending" &&
          selection.selectedIds.has(request.id)
      )
      .map((request) => request.id)

    try {
      setRequestsError(null)
      if (ids.length === 0) {
        throw new Error("No pending requests selected")
      }
      await Promise.all(
        ids.map((id) =>
          bulkRequestAction.target === "part"
            ? requestApi.action(id, bulkRequestAction.action, managerComment)
            : requestApi.missingAction(
                id,
                bulkRequestAction.action,
                managerComment
              )
        )
      )
      await reloadRequests()
      await reloadParts()
      await reloadAnalytics()
      await reloadNotificationSummary()
      selection.clear()
      setBulkRequestAction(null)
    } catch {
      setRequestsError("Failed to update selected requests")
    }
  }

  const activePartActionConfig = pendingPartAction
    ? getActionCommentConfig(pendingPartAction.action)
    : null
  const activeMissingActionConfig = pendingMissingAction
    ? getActionCommentConfig(pendingMissingAction.action)
    : null

  return (
    <>
      <h2 className="text-3xl font-bold mb-8">Requests</h2>

      <div
        id="PartRequests"
        className={`bg-white rounded-lg shadow p-6 mb-8 overflow-x-auto ${isHighlightTarget(highlightTarget, "Requests", "PartRequests")
          ? "ring-4 ring-yellow-300"
          : ""
          }`}
      >
        <h3 className="text-xl font-bold mb-4">Part Requests</h3>

        {isLoadingRequests && (
          <div className="mb-6 rounded border border-gray-200 bg-gray-50 px-4 py-3 text-gray-600">
            Loading requests...
          </div>
        )}

        {requestsError && (
          <div className="mb-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {requestsError}
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search collaborator, part, reference..."
              className="min-w-0 flex-1 rounded border border-gray-300 px-4 py-2 sm:w-[300px] sm:flex-none"
            />
            <FilterPanel
              fields={requestFilterFields}
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
              setDateSort(event.target.value as "oldest" | "latest")
            }
            className="rounded border border-gray-300 bg-white px-4 py-2"
          >
            <option value="oldest">Oldest first</option>
            <option value="latest">Latest first</option>
          </select>
        </div>

        <BulkToolbar count={partRequestSelection.selectedCount}>
          {canApproveRequests && (
            <>
              <button
                onClick={() =>
                  setBulkRequestAction({ target: "part", action: "approve" })
                }
                className="rounded bg-yellow-400 px-3 py-2 text-sm font-semibold text-black"
              >
                Approve selected pending
              </button>
              <button
                onClick={() =>
                  setBulkRequestAction({ target: "part", action: "reject" })
                }
                className="rounded bg-red-600 px-3 py-2 text-sm font-semibold text-white"
              >
                Reject selected pending
              </button>
            </>
          )}
        </BulkToolbar>
        <table className="w-full min-w-[1240px]">
          <thead>
            <tr className="border-b bg-gray-100 text-xs uppercase text-gray-600">
              <SelectionHeader
                checked={partRequestSelection.allSelected}
                onChange={partRequestSelection.toggleAll}
              />
              <th className="px-3 py-3 text-left">Collaborator</th>
              <th className="px-3 py-3 text-left">Part</th>
              <th className="px-3 py-3 text-left">Type</th>
              <th className="px-3 py-3 text-left">Quantity</th>
              <th className="px-3 py-3 text-left">Requested At</th>
              <th className="px-3 py-3 text-left">Start / Usage Date</th>
              <th className="px-3 py-3 text-left">Due Date</th>
              <th className="px-3 py-3 text-left">Reason</th>
              <th className="px-3 py-3 text-left">Status</th>
              <th className="px-3 py-3 text-left">Comment</th>
              {canApproveRequests && (
                <th className="px-3 py-3 text-left">Actions</th>
              )}
            </tr>
          </thead>

          <tbody>
            {paginatedPartRequests.items.map((request) => (
              <tr
                id={`PartRequests-${request.id}`}
                key={request.id}
                className={`border-b border-gray-100 transition hover:bg-gray-50 ${
                  partRequestSelection.selectedIds.has(request.id)
                    ? "bg-yellow-50"
                    : ""
                } ${isHighlightTarget(
                  highlightTarget,
                  "Requests",
                  "PartRequests",
                  request.id
                )
                  ? "bg-yellow-100"
                  : ""
                  }`}
              >
                <SelectionCell
                  checked={partRequestSelection.selectedIds.has(request.id)}
                  onChange={() => partRequestSelection.toggle(request.id)}
                  label={`Select request ${request.id}`}
                />
                <td className="px-3 py-4 font-medium">
                  {request.collaborator?.name || "Unknown"}
                </td>
                <td className="px-3 py-4">{request.part?.name || "Unknown"}</td>
                <td className="px-3 py-4">{request.requestType}</td>
                <td className="px-3 py-4">{request.quantity}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-600">
                  {formatRequestedAt(request.createdAt)}
                </td>
                <td className="px-3 py-4">{getRequestStartDate(request)}</td>
                <td className="px-3 py-4">{getRequestDueDate(request)}</td>
                <td className="max-w-56 px-3 py-4 text-sm text-gray-600">
                  <TextCell value={request.reason} />
                </td>
                <td className="px-3 py-4">
                  <StatusPill status={request.status} />
                </td>
                <td className="max-w-48 px-3 py-4 text-sm text-gray-600">
                  <TextCell value={request.managerComment} />
                </td>
                {canApproveRequests && (
                  <td className="px-3 py-4">
                    <div className="flex flex-wrap gap-2">
                      <IconButton
                        icon={<Eye className="h-4 w-4" />}
                        label="View request details"
                        onClick={() => setViewingRequestDetails(request)}
                        tone="blue"
                      />
                      {request.status === "Pending" && (
                        <>
                          <IconButton
                            icon={<CheckCircle className="h-4 w-4" />}
                            label="Approve request"
                            onClick={() =>
                              setPendingPartAction({
                                id: request.id,
                                action: "approve",
                              })
                            }
                            tone="yellow"
                          />
                          <IconButton
                            icon={<XCircle className="h-4 w-4" />}
                            label="Reject request"
                            onClick={() =>
                              setPendingPartAction({
                                id: request.id,
                                action: "reject",
                              })
                            }
                            tone="red"
                          />
                        </>
                      )}

                      {request.status === "Return Pending" && (
                        <IconButton
                          icon={<ClipboardCheck className="h-4 w-4" />}
                          label="Confirm return"
                          onClick={() => setConfirmingReturnRequest(request)}
                          tone="yellow"
                        />
                      )}
                      {hasReturnReport(request) && (
                        <IconButton
                          icon={<FileText className="h-4 w-4" />}
                          label="View return report"
                          onClick={() => setViewingReturnReport(request)}
                          tone={
                            request.status === "Damaged" ? "red" : "neutral"
                          }
                        />
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination
          page={paginatedPartRequests.page}
          totalPages={paginatedPartRequests.totalPages}
          start={paginatedPartRequests.start}
          end={paginatedPartRequests.end}
          total={paginatedPartRequests.total}
          onPageChange={setPartPage}
        />
      </div>

      <div
        id="MissingItemRequests"
        className={`bg-white rounded-lg shadow p-6 overflow-x-auto ${isHighlightTarget(highlightTarget, "Requests", "MissingItemRequests")
          ? "ring-4 ring-yellow-300"
          : ""
          }`}
      >
        <h3 className="text-xl font-bold mb-4">Missing Item Requests</h3>
        <BulkToolbar count={missingRequestSelection.selectedCount}>
          {canApproveRequests && (
            <>
              <button
                onClick={() =>
                  setBulkRequestAction({ target: "missing", action: "approve" })
                }
                className="rounded bg-yellow-400 px-3 py-2 text-sm font-semibold text-black"
              >
                Approve selected pending
              </button>
              <button
                onClick={() =>
                  setBulkRequestAction({ target: "missing", action: "reject" })
                }
                className="rounded bg-red-600 px-3 py-2 text-sm font-semibold text-white"
              >
                Reject selected pending
              </button>
            </>
          )}
        </BulkToolbar>
        <table className="w-full min-w-[1180px]">
          <thead>
            <tr className="border-b bg-gray-100 text-xs uppercase text-gray-600">
              <SelectionHeader
                checked={missingRequestSelection.allSelected}
                onChange={missingRequestSelection.toggleAll}
              />
              <th className="px-3 py-3 text-left">Collaborator</th>
              <th className="px-3 py-3 text-left">Item</th>
              <th className="px-3 py-3 text-left">Category</th>
              <th className="px-3 py-3 text-left">Manufacturer</th>
              <th className="px-3 py-3 text-left">Reference</th>
              <th className="px-3 py-3 text-left">Quantity</th>
              <th className="px-3 py-3 text-left">Requested At</th>
              <th className="px-3 py-3 text-left">Needed Date</th>
              <th className="px-3 py-3 text-left">Reason</th>
              <th className="px-3 py-3 text-left">Status</th>
              <th className="px-3 py-3 text-left">Comment</th>
              {canApproveRequests && (
                <th className="px-3 py-3 text-left">Actions</th>
              )}
            </tr>
          </thead>

          <tbody>
            {paginatedMissingRequests.items.map((request) => (
              <tr
                id={`MissingItemRequests-${request.id}`}
                key={request.id}
                className={`border-b border-gray-100 transition hover:bg-gray-50 ${
                  missingRequestSelection.selectedIds.has(request.id)
                    ? "bg-yellow-50"
                    : ""
                } ${isHighlightTarget(
                  highlightTarget,
                  "Requests",
                  "MissingItemRequests",
                  request.id
                )
                  ? "bg-yellow-100"
                  : ""
                  }`}
              >
                <SelectionCell
                  checked={missingRequestSelection.selectedIds.has(request.id)}
                  onChange={() => missingRequestSelection.toggle(request.id)}
                  label={`Select missing item request ${request.id}`}
                />
                <td className="px-3 py-4 font-medium">
                  {request.collaborator?.name || "Unknown"}
                </td>
                <td className="px-3 py-4">{request.itemName}</td>
                <td className="px-3 py-4">{request.category || "N/A"}</td>
                <td className="px-3 py-4">{request.manufacturer || "N/A"}</td>
                <td className="px-3 py-4">{request.reference || "N/A"}</td>
                <td className="px-3 py-4">{request.quantityNeeded}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-600">
                  {formatRequestedAt(request.createdAt)}
                </td>
                <td className="px-3 py-4">{request.neededDate}</td>
                <td className="px-3 py-4 text-sm text-gray-600">
                  <TextCell value={request.reason} />
                </td>
                <td className="px-3 py-4">
                  <StatusPill status={request.status} />
                </td>
                <td className="max-w-48 px-3 py-4 text-sm text-gray-600">
                  <TextCell value={request.managerComment} />
                </td>
                {canApproveRequests && (
                  <td className="px-3 py-4">
                    <div className="flex items-center gap-2">
                      <IconButton
                        icon={<Eye className="h-4 w-4" />}
                        label="View request details"
                        onClick={() => setViewingRequestDetails(request)}
                        tone="blue"
                      />
                      {request.status === "Pending" && (
                        <>
                          <IconButton
                            icon={<CheckCircle className="h-4 w-4" />}
                            label="Approve missing item request"
                            onClick={() =>
                              setPendingMissingAction({
                                id: request.id,
                                action: "approve",
                              })
                            }
                            tone="yellow"
                          />
                          <IconButton
                            icon={<XCircle className="h-4 w-4" />}
                            label="Reject missing item request"
                            onClick={() =>
                              setPendingMissingAction({
                                id: request.id,
                                action: "reject",
                              })
                            }
                            tone="red"
                          />
                        </>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination
          page={paginatedMissingRequests.page}
          totalPages={paginatedMissingRequests.totalPages}
          start={paginatedMissingRequests.start}
          end={paginatedMissingRequests.end}
          total={paginatedMissingRequests.total}
          onPageChange={setMissingPage}
        />
      </div>

      {pendingPartAction && activePartActionConfig && (
        <ActionCommentModal
          title={activePartActionConfig.title}
          message={activePartActionConfig.message}
          confirmLabel={activePartActionConfig.confirmLabel}
          isCommentRequired={activePartActionConfig.isCommentRequired}
          onClose={() => setPendingPartAction(null)}
          onConfirm={(comment) =>
            handlePartRequestAction(
              pendingPartAction.id,
              pendingPartAction.action,
              comment
            )
          }
        />
      )}
      {bulkRequestAction && (
        <BulkConfirmModal
          title={`${bulkRequestAction.action === "approve" ? "Approve" : "Reject"} selected requests`}
          message={`${bulkRequestAction.action === "approve" ? "Approve" : "Reject"} ${
            bulkRequestAction.target === "part"
              ? partRequestSelection.selectedCount
              : missingRequestSelection.selectedCount
          } selected requests? Only pending rows will be changed.`}
          confirmLabel={
            bulkRequestAction.action === "approve"
              ? "Approve selected"
              : "Reject selected"
          }
          tone={bulkRequestAction.action === "approve" ? "yellow" : "red"}
          commentLabel={
            bulkRequestAction.action === "reject"
              ? "Shared rejection comment"
              : undefined
          }
          commentRequired={bulkRequestAction.action === "reject"}
          onClose={() => setBulkRequestAction(null)}
          onConfirm={handleBulkRequestAction}
        />
      )}

      {viewingRequestDetails && (
        <RequestDetailsModal
          request={viewingRequestDetails}
          canManage={canApproveRequests}
          onClose={() => setViewingRequestDetails(null)}
          onApprove={(comment) => {
            if (isMissingItemRequest(viewingRequestDetails)) {
              return handleMissingItemAction(
                viewingRequestDetails.id,
                "approve",
                comment
              )
            }
            return handlePartRequestAction(
              viewingRequestDetails.id,
              "approve",
              comment
            )
          }}
          onReject={(comment) => {
            if (isMissingItemRequest(viewingRequestDetails)) {
              return handleMissingItemAction(
                viewingRequestDetails.id,
                "reject",
                comment
              )
            }
            return handlePartRequestAction(
              viewingRequestDetails.id,
              "reject",
              comment
            )
          }}
        />
      )}

      {pendingMissingAction && activeMissingActionConfig && (
        <ActionCommentModal
          title={activeMissingActionConfig.title}
          message={activeMissingActionConfig.message}
          confirmLabel={activeMissingActionConfig.confirmLabel}
          isCommentRequired={activeMissingActionConfig.isCommentRequired}
          onClose={() => setPendingMissingAction(null)}
          onConfirm={(comment) =>
            handleMissingItemAction(
              pendingMissingAction.id,
              pendingMissingAction.action,
              comment
            )
          }
        />
      )}

      {confirmingReturnRequest && (
        <ConfirmReturnModal
          request={confirmingReturnRequest}
          onClose={() => setConfirmingReturnRequest(null)}
          onConfirm={handleConfirmReturn}
        />
      )}

      {viewingReturnReport && (
        <ReturnReportModal
          request={viewingReturnReport}
          onClose={() => setViewingReturnReport(null)}
        />
      )}
    </>
  )
}

export function MyRequestsPage({
  partRequests,
  missingItemRequests,
  isLoadingRequests,
  requestsError,
  reloadRequests,
  setRequestsError,
  highlightTarget,
  reloadNotificationSummary,
  inventoryCategories = missingItemCategories,
}: {
  partRequests: PartRequest[]
  missingItemRequests: MissingItemRequest[]
  isLoadingRequests: boolean
  requestsError: string | null
  reloadRequests: () => Promise<void>
  setRequestsError: React.Dispatch<React.SetStateAction<string | null>>
  highlightTarget: {
    targetPage: string
    targetSection?: string
    targetId?: number
  } | null
  reloadNotificationSummary: () => Promise<void>
  inventoryCategories?: string[]
}) {
  const [isMissingItemModalOpen, setIsMissingItemModalOpen] = useState(false)
  const [declaringReturnRequest, setDeclaringReturnRequest] =
    useState<PartRequest | null>(null)
  const [viewingReturnReport, setViewingReturnReport] =
    useState<PartRequest | null>(null)
  const [viewingRequestDetails, setViewingRequestDetails] =
    useState<RequestDetailsItem | null>(null)
  const [partPage, setPartPage] = useState(1)
  const [missingPage, setMissingPage] = useState(1)
  const sortedPartRequests = sortWorkflowRequests(partRequests)
  const sortedMissingItemRequests = sortWorkflowRequests(missingItemRequests)
  const paginatedPartRequests = getPageItems(sortedPartRequests, partPage)
  const paginatedMissingRequests = getPageItems(
    sortedMissingItemRequests,
    missingPage
  )

  async function handleMissingItemRequest(input: MissingItemRequestInput) {
    try {
      setRequestsError(null)

      await requestApi.createMissing(input)

      await reloadRequests()
      await reloadNotificationSummary()
      return null
    } catch (error) {
      return getApiErrorMessage(error, "Failed to submit missing item request")
    }
  }

  async function handleDeclareReturn(input: {
    goodQuantity: number
    damagedQuantity: number
    comment: string
  }) {
    if (!declaringReturnRequest) {
      return
    }

    try {
      setRequestsError(null)

      await requestApi.declareReturn(declaringReturnRequest.id, input)

      await reloadRequests()
      await reloadNotificationSummary()
      setDeclaringReturnRequest(null)
    } catch {
      setRequestsError("Failed to declare return")
    }
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <h2 className="text-3xl font-bold">My Requests</h2>

        <button
          onClick={() => setIsMissingItemModalOpen(true)}
          className="bg-yellow-400 text-black font-semibold px-4 py-2 rounded"
        >
          Request Missing Item
        </button>
      </div>

      <div
        id="MyPartRequests"
        className={`bg-white rounded-lg shadow p-6 mb-8 overflow-x-auto ${isHighlightTarget(highlightTarget, "My Requests", "MyPartRequests")
          ? "ring-4 ring-yellow-300"
          : ""
          }`}
      >
        {isLoadingRequests && (
          <div className="mb-6 rounded border border-gray-200 bg-gray-50 px-4 py-3 text-gray-600">
            Loading requests...
          </div>
        )}

        {requestsError && (
          <div className="mb-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {requestsError}
          </div>
        )}

        <h3 className="text-xl font-bold mb-4">Part Requests</h3>
        <table className="w-full min-w-[860px]">
          <thead>
            <tr className="border-b bg-gray-100">
              <th className="text-left py-3 px-2">Part</th>
              <th className="text-left py-3 px-2">Type</th>
              <th className="text-left py-3 px-2">Quantity</th>
              <th className="text-left py-3 px-2">Requested At</th>
              <th className="text-left py-3 px-2">Start / Usage Date</th>
              <th className="text-left py-3 px-2">Due Date</th>
              <th className="text-left py-3 px-2">Reason</th>
              <th className="text-left py-3 px-2">Status</th>
              <th className="text-left py-3 px-2">Manager Comment</th>
              <th className="text-left py-3 px-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedPartRequests.items.map((request) => (
              <tr
                id={`MyPartRequests-${request.id}`}
                key={request.id}
                className={`border-b border-gray-100 transition hover:bg-gray-50 ${isHighlightTarget(
                  highlightTarget,
                  "My Requests",
                  "MyPartRequests",
                  request.id
                )
                  ? "bg-yellow-100"
                  : ""
                  }`}
              >
                <td className="py-3 px-2 font-medium">
                  {request.part?.name || "Unknown"}
                </td>
                <td className="py-3 px-2">{request.requestType}</td>
                <td className="py-3 px-2">{request.quantity}</td>
                <td className="whitespace-nowrap px-2 py-3 text-sm text-gray-600">
                  {formatRequestedAt(request.createdAt)}
                </td>
                <td className="py-3 px-2">{getRequestStartDate(request)}</td>
                <td className="py-3 px-2">{getRequestDueDate(request)}</td>
                <td className="py-3 px-2 text-sm text-gray-600">
                  <TextCell value={request.reason} />
                </td>
                <td className="py-3 px-2">
                  <StatusPill status={request.status} />
                </td>
                <td className="py-3 px-2">
                  <TextCell value={request.managerComment} />
                </td>
                <td className="w-28 py-3 px-2">
                  <div className="flex items-center gap-2">
                    <IconButton
                      icon={<Eye className="h-4 w-4" />}
                      label="View request details"
                      onClick={() => setViewingRequestDetails(request)}
                      tone="blue"
                    />
                    {(request.status === "Reserved" ||
                      request.status === "Borrowed") && (
                        <IconButton
                          icon={<RotateCcw className="h-4 w-4" />}
                          label="Declare return"
                          onClick={() => setDeclaringReturnRequest(request)}
                          tone="blue"
                        />
                      )}
                    {hasReturnReport(request) && (
                      <IconButton
                        icon={<FileText className="h-4 w-4" />}
                        label="View return report"
                        onClick={() => setViewingReturnReport(request)}
                        tone={request.status === "Damaged" ? "red" : "neutral"}
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination
          page={paginatedPartRequests.page}
          totalPages={paginatedPartRequests.totalPages}
          start={paginatedPartRequests.start}
          end={paginatedPartRequests.end}
          total={paginatedPartRequests.total}
          onPageChange={setPartPage}
        />
      </div>

      <div
        id="MyMissingItemRequests"
        className={`bg-white rounded-lg shadow p-6 overflow-x-auto ${isHighlightTarget(
          highlightTarget,
          "My Requests",
          "MyMissingItemRequests"
        )
          ? "ring-4 ring-yellow-300"
          : ""
          }`}
      >
        <h3 className="text-xl font-bold mb-4">Missing Item Requests</h3>
        <table className="w-full min-w-[860px]">
          <thead>
            <tr className="border-b bg-gray-100 text-xs uppercase text-gray-600">
              <th className="text-left py-3 px-2">Item</th>
              <th className="text-left py-3 px-2">Category</th>
              <th className="text-left py-3 px-2">Quantity</th>
              <th className="text-left py-3 px-2">Requested At</th>
              <th className="text-left py-3 px-2">Needed Date</th>
              <th className="text-left py-3 px-2">Reason</th>
              <th className="text-left py-3 px-2">Status</th>
              <th className="text-left py-3 px-2">Manager Comment</th>
              <th className="text-left py-3 px-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedMissingRequests.items.map((request) => (
              <tr
                id={`MyMissingItemRequests-${request.id}`}
                key={request.id}
                className={`border-b hover:bg-gray-50 ${isHighlightTarget(
                  highlightTarget,
                  "My Requests",
                  "MyMissingItemRequests",
                  request.id
                )
                  ? "bg-yellow-100"
                  : ""
                  }`}
              >
                <td className="py-3 px-2 font-medium">{request.itemName}</td>
                <td className="py-3 px-2">{request.category}</td>
                <td className="py-3 px-2">{request.quantityNeeded}</td>
                <td className="whitespace-nowrap px-2 py-3 text-sm text-gray-600">
                  {formatRequestedAt(request.createdAt)}
                </td>
                <td className="py-3 px-2">{request.neededDate}</td>
                <td className="py-3 px-2 text-sm text-gray-600">
                  <TextCell value={request.reason} />
                </td>
                <td className="py-3 px-2">
                  <StatusPill status={request.status} />
                </td>
                <td className="py-3 px-2">
                  <TextCell value={request.managerComment} />
                </td>
                <td className="py-3 px-2">
                  <IconButton
                    icon={<Eye className="h-4 w-4" />}
                    label="View request details"
                    onClick={() => setViewingRequestDetails(request)}
                    tone="blue"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination
          page={paginatedMissingRequests.page}
          totalPages={paginatedMissingRequests.totalPages}
          start={paginatedMissingRequests.start}
          end={paginatedMissingRequests.end}
          total={paginatedMissingRequests.total}
          onPageChange={setMissingPage}
        />
      </div>

      {isMissingItemModalOpen && (
        <MissingItemRequestModal
          inventoryCategories={inventoryCategories}
          onClose={() => setIsMissingItemModalOpen(false)}
          onSave={handleMissingItemRequest}
        />
      )}

      {declaringReturnRequest && (
        <DeclareReturnModal
          request={declaringReturnRequest}
          onClose={() => setDeclaringReturnRequest(null)}
          onDeclare={handleDeclareReturn}
        />
      )}

      {viewingReturnReport && (
        <ReturnReportModal
          request={viewingReturnReport}
          onClose={() => setViewingReturnReport(null)}
        />
      )}

      {viewingRequestDetails && (
        <RequestDetailsModal
          request={viewingRequestDetails}
          onClose={() => setViewingRequestDetails(null)}
        />
      )}
    </>
  )
}

export function ReservationsPage({
  parts,
  collaborators,
  partRequests,
  isLoadingReservations,
  reservationsError,
  reloadParts,
  reloadReservations,
  reloadRequests,
  reloadAnalytics,
  reloadNotificationSummary,
  setReservationsError,
  canCreateReservations,
  canManageReservations,
}: {
  parts: Part[]
  collaborators: Collaborator[]
  partRequests: PartRequest[]
  isLoadingReservations: boolean
  reservationsError: string | null
  reloadParts: () => Promise<void>
  reloadReservations: () => Promise<void>
  reloadRequests: () => Promise<void>
  reloadAnalytics: () => Promise<void>
  reloadNotificationSummary: () => Promise<void>
  setReservationsError: React.Dispatch<React.SetStateAction<string | null>>
  canCreateReservations: boolean
  canManageReservations: boolean
}) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [pendingReturnRequestId, setPendingReturnRequestId] = useState<number | null>(
    null
  )
  const [viewingReturnReport, setViewingReturnReport] =
    useState<PartRequest | null>(null)
  const [viewingRequestDetails, setViewingRequestDetails] =
    useState<PartRequest | null>(null)
  const [isBulkReturnOpen, setIsBulkReturnOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [dateSort, setDateSort] = useState<"latest" | "oldest">("latest")
  const [advancedFilters, setAdvancedFilters] = useState<FilterCondition[]>([])
  const [advancedMatchMode, setAdvancedMatchMode] =
    useState<FilterMatchMode>("all")
  const operationalRequests = partRequests.filter(
    (request) =>
      request.status === "Reserved" ||
      request.status === "Borrowed" ||
      request.status === "Return Pending" ||
      request.status === "Returned" ||
      request.status === "Damaged"
  )
  const reservationFilterFields: FilterField<PartRequest>[] = [
    { key: "collaborator", label: "Collaborator", type: "text", getValue: (item) => item.collaborator?.name },
    { key: "part", label: "Part", type: "text", getValue: (item) => `${item.part?.name || ""} ${item.part?.reference || ""}` },
    { key: "type", label: "Request Type", type: "select", options: ["Reservation", "Borrow"], getValue: (item) => item.requestType },
    { key: "quantity", label: "Quantity", type: "number", getValue: (item) => item.quantity },
    { key: "start", label: "Start Date", type: "date", getValue: (item) => item.startDate || item.usageDate },
    { key: "due", label: "Due Date", type: "date", getValue: (item) => item.dueDate || item.usageDate },
    { key: "status", label: "Status", type: "select", options: ["Reserved", "Borrowed", "Return Pending", "Returned", "Damaged"], getValue: (item) => item.status },
    { key: "division", label: "Division", type: "select", options: divisions, getValue: (item) => item.collaborator?.division },
    { key: "group", label: "Group", type: "select", options: collaboratorGroups, getValue: (item) => item.collaborator?.group },
  ]
  const filteredRequests = applyFilterConditions(
    operationalRequests.filter((request) => {
      const normalizedSearch = search.trim().toLowerCase()
      const matchesSearch =
        !normalizedSearch ||
        (request.collaborator?.name || "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        (request.part?.name || "").toLowerCase().includes(normalizedSearch) ||
        (request.part?.reference || "").toLowerCase().includes(normalizedSearch)
      return matchesSearch
    }),
    reservationFilterFields,
    advancedFilters,
    advancedMatchMode
  )
    .sort((firstRequest, secondRequest) => {
      const getSortTime = (request: PartRequest) => {
        const date =
          request.createdAt ||
          request.startDate ||
          request.usageDate ||
          request.expectedReturnDate
        return date ? new Date(date).getTime() : request.id
      }
      const difference = getSortTime(firstRequest) - getSortTime(secondRequest)
      return dateSort === "latest" ? -difference : difference
    })
  const paginatedRequests = getPageItems(filteredRequests, page)
  const reservationSelection = usePageSelection(paginatedRequests.items, page)

  useEffect(() => {
    setPage(1)
  }, [search, dateSort, advancedFilters, advancedMatchMode])

  async function handleCreate(reservation: Reservation) {
    const requestType: "Borrow" | "Reservation" =
      reservation.status === "Borrowed" ? "Borrow" : "Reservation"
    const requestPayload =
      requestType === "Borrow"
        ? {
          collaboratorId: reservation.collaboratorId,
          partId: reservation.partId,
          quantity: reservation.quantity,
          requestType,
          reason: "Created directly from Reservations page",
          startDate: new Date().toISOString().slice(0, 10),
          dueDate: reservation.expectedReturnDate,
        }
        : {
          collaboratorId: reservation.collaboratorId,
          partId: reservation.partId,
          quantity: reservation.quantity,
          requestType,
          reason: "Created directly from Reservations page",
          usageDate: reservation.expectedReturnDate,
        }

    try {
      setReservationsError(null)

      const createdRequest = await requestApi.create(requestPayload)
      await requestApi.action(
        createdRequest.id,
        "approve",
        "Created directly from Reservations page"
      )

      await reloadReservations()
      await reloadRequests()
      await reloadParts()
      await reloadAnalytics()
      await reloadNotificationSummary()
      setIsModalOpen(false)
    } catch {
      setReservationsError("Failed to create reservation")
    }
  }

  async function returnRequest(id: number, managerComment = "") {
    try {
      setReservationsError(null)

      await requestApi.action(id, "return", managerComment)

      await reloadRequests()
      await reloadParts()
      await reloadAnalytics()
      await reloadNotificationSummary()
      setPendingReturnRequestId(null)
    } catch {
      setReservationsError("Failed to return request")
    }
  }

  async function handleBulkReturn(managerComment: string) {
    const eligibleIds = paginatedRequests.items
      .filter(
        (request) =>
          reservationSelection.selectedIds.has(request.id) &&
          (request.status === "Reserved" || request.status === "Borrowed")
      )
      .map((request) => request.id)

    try {
      setReservationsError(null)
      if (eligibleIds.length === 0) {
        throw new Error("No returnable reservations selected")
      }
      await Promise.all(
        eligibleIds.map((id) =>
          requestApi.action(id, "return", managerComment)
        )
      )
      await reloadRequests()
      await reloadParts()
      await reloadAnalytics()
      await reloadNotificationSummary()
      reservationSelection.clear()
      setIsBulkReturnOpen(false)
    } catch {
      setReservationsError("Failed to return selected reservations")
    }
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <h2 className="text-3xl font-bold">Reservations</h2>

        {canCreateReservations && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-yellow-400 text-black font-semibold px-4 py-2 rounded"
          >
            + New Reservation
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6 overflow-x-auto">
        {isLoadingReservations && (
          <div className="mb-6 rounded border border-gray-200 bg-gray-50 px-4 py-3 text-gray-600">
            Loading reservations...
          </div>
        )}

        {reservationsError && (
          <div className="mb-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {reservationsError}
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search collaborator, part, reference..."
              className="min-w-0 flex-1 rounded border border-gray-300 px-4 py-2 sm:w-[300px] sm:flex-none"
            />
            <FilterPanel
              fields={reservationFilterFields}
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
              setDateSort(event.target.value as typeof dateSort)
            }
            className="rounded border border-gray-300 px-4 py-2"
            aria-label="Sort reservations by date"
          >
            <option value="latest">Latest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
        <BulkToolbar count={reservationSelection.selectedCount}>
          {canManageReservations && (
            <button
              onClick={() => setIsBulkReturnOpen(true)}
              className="rounded bg-green-600 px-3 py-2 text-sm font-semibold text-white"
            >
              Mark selected returned
            </button>
          )}
        </BulkToolbar>

        <table className="w-full min-w-[1220px]">
          <thead>
            <tr className="border-b bg-gray-100">
              <SelectionHeader
                checked={reservationSelection.allSelected}
                onChange={reservationSelection.toggleAll}
              />
              <th className="text-left py-3 px-2">Collaborator</th>
              <th className="text-left py-3 px-2">Part</th>
              <th className="text-left py-3 px-2">Request Type</th>
              <th className="text-left py-3 px-2">Quantity</th>
              <th className="text-left py-3 px-2">Requested At</th>
              <th className="text-left py-3 px-2">Start Date</th>
              <th className="text-left py-3 px-2">Due Date</th>
              <th className="text-left py-3 px-2">Reason</th>
              <th className="text-left py-3 px-2">Status</th>
              <th className="text-left py-3 px-2">Manager Comment</th>
              <th className="text-left py-3 px-2">Details</th>
              {canManageReservations && (
                <th className="text-left py-3 px-2">Actions</th>
              )}
            </tr>
          </thead>

          <tbody>
            {paginatedRequests.items.map((request) => (
              <tr
                key={request.id}
                className={`border-b border-gray-100 transition hover:bg-gray-50 ${
                  reservationSelection.selectedIds.has(request.id)
                    ? "bg-yellow-50"
                    : ""
                }`}
              >
                <SelectionCell
                  checked={reservationSelection.selectedIds.has(request.id)}
                  onChange={() => reservationSelection.toggle(request.id)}
                  label={`Select reservation ${request.id}`}
                />
                <td className="py-3 px-2 font-medium">
                  {request.collaborator?.name || "Unknown collaborator"}
                </td>
                <td className="py-3 px-2">{request.part?.name || "Unknown part"}</td>
                <td className="py-3 px-2">{request.requestType}</td>
                <td className="py-3 px-2">{request.quantity}</td>
                <td className="whitespace-nowrap py-3 px-2 text-sm text-gray-600">
                  {formatRequestedAt(request.createdAt)}
                </td>
                <td className="py-3 px-2">
                  {getRequestStartDate(request)}
                </td>
                <td className="py-3 px-2">
                  {getRequestDueDate(request)}
                </td>
                <td className="py-3 px-2 text-sm text-gray-600">
                  <TextCell value={request.reason} />
                </td>
                <td className="py-3 px-2">
                  <StatusPill status={request.status} />
                </td>
                <td className="py-3 px-2">
                  <TextCell value={request.managerComment} />
                </td>
                <td className="py-3 px-2">
                  <IconButton
                    icon={<Eye className="h-4 w-4" />}
                    label="View request details"
                    onClick={() => setViewingRequestDetails(request)}
                    tone="blue"
                  />
                </td>
                {canManageReservations && (
                  <td className="py-3 px-2">
                    <div className="flex flex-wrap gap-2">
                      {(request.status === "Reserved" ||
                        request.status === "Borrowed") && (
                          <IconButton
                            icon={<RotateCcw className="h-4 w-4" />}
                            label="Mark returned"
                            onClick={() => setPendingReturnRequestId(request.id)}
                            tone="green"
                          />
                        )}
                      {hasReturnReport(request) && (
                        <IconButton
                          icon={<FileText className="h-4 w-4" />}
                          label="View return report"
                          onClick={() => setViewingReturnReport(request)}
                          tone={request.status === "Damaged" ? "red" : "neutral"}
                        />
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}

            {filteredRequests.length === 0 && (
              <tr>
                <td
                  colSpan={canManageReservations ? 13 : 12}
                  className="py-8 text-center text-gray-500"
                >
                  No reservations match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination
          page={paginatedRequests.page}
          totalPages={paginatedRequests.totalPages}
          start={paginatedRequests.start}
          end={paginatedRequests.end}
          total={paginatedRequests.total}
          onPageChange={setPage}
        />
      </div>

      {isModalOpen && (
        <ReservationModal
          parts={parts}
          collaborators={collaborators}
          onClose={() => setIsModalOpen(false)}
          onSave={handleCreate}
        />
      )}

      {pendingReturnRequestId !== null && (
        <ActionCommentModal
          title="Mark as Returned"
          message="Add return note."
          confirmLabel="Mark Returned"
          onClose={() => setPendingReturnRequestId(null)}
          onConfirm={(comment) => returnRequest(pendingReturnRequestId, comment)}
        />
      )}
      {isBulkReturnOpen && (
        <BulkConfirmModal
          title="Mark reservations returned"
          message={`Mark ${reservationSelection.selectedCount} selected reservations as returned? Only Reserved and Borrowed rows will be changed.`}
          confirmLabel="Mark returned"
          tone="green"
          commentLabel="Shared return note"
          onClose={() => setIsBulkReturnOpen(false)}
          onConfirm={handleBulkReturn}
        />
      )}

      {viewingReturnReport && (
        <ReturnReportModal
          request={viewingReturnReport}
          onClose={() => setViewingReturnReport(null)}
        />
      )}

      {viewingRequestDetails && (
        <RequestDetailsModal
          request={viewingRequestDetails}
          onClose={() => setViewingRequestDetails(null)}
        />
      )}
    </>
  )
}

function ReservationModal({
  parts,
  collaborators,
  onClose,
  onSave,
}: {
  parts: Part[]
  collaborators: Collaborator[]
  onClose: () => void
  onSave: (reservation: Reservation) => void
}) {
  const [form, setForm] = useState<Reservation>({
    id: Date.now(),
    collaboratorId: collaborators[0]?.id || 0,
    partId: parts[0]?.id || 0,
    collaborator: collaborators[0]?.name || "",
    partName: parts[0]?.name || "",
    quantity: 1,
    expectedReturnDate: "",
    status: "Reserved",
  })
  const selectedPart = parts.find((part) => part.id === form.partId)
  const hasInvalidQuantity =
    form.quantity <= 0 ||
    Boolean(selectedPart && form.quantity > selectedPart.availableQuantity)
  const hasPastExpectedReturnDate = isPastDate(form.expectedReturnDate)

  function updateField(
    field: keyof Reservation,
    value: string | number
  ) {
    setForm({ ...form, [field]: value })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-[500px]">
        <h3 className="text-2xl font-bold mb-6">New Reservation</h3>

        <div className="space-y-4">
          <select
            value={form.collaboratorId}
            onChange={(e) => {
              const collaboratorId = Number(e.target.value)
              const collaborator = collaborators.find(
                (currentCollaborator) => currentCollaborator.id === collaboratorId
              )

              setForm({
                ...form,
                collaboratorId,
                collaborator: collaborator?.name || "",
              })
            }}
            className="w-full border rounded px-4 py-2"
          >
            {collaborators.map((collaborator) => (
              <option key={collaborator.id} value={collaborator.id}>
                {collaborator.name}
              </option>
            ))}
          </select>

          <select
            value={form.partId}
            onChange={(e) => {
              const partId = Number(e.target.value)
              const part = parts.find((currentPart) => currentPart.id === partId)

              setForm({
                ...form,
                partId,
                partName: part?.name || "",
              })
            }}
            className="w-full border rounded px-4 py-2"
          >
            {parts.map((part) => (
              <option key={part.id} value={part.id}>
                {part.name} ({part.availableQuantity} available)
              </option>
            ))}
          </select>

          <input
            type="number"
            min={1}
            placeholder="Quantity"
            value={form.quantity}
            onChange={(e) =>
              updateField("quantity", Number(e.target.value))
            }
            className="w-full border rounded px-4 py-2"
          />
          {hasInvalidQuantity && (
            <p className="text-sm text-red-600">
              Quantity must be greater than 0 and no more than available stock
            </p>
          )}

          <input
            type="date"
            min={getTodayDate()}
            value={form.expectedReturnDate}
            onChange={(e) =>
              updateField("expectedReturnDate", e.target.value)
            }
            className="w-full border rounded px-4 py-2"
          />
          {hasPastExpectedReturnDate && (
            <p className="text-sm text-red-600">Date cannot be in the past</p>
          )}

          <select
            value={form.status}
            onChange={(e) =>
              updateField("status", e.target.value as Reservation["status"])
            }
            className="w-full border rounded px-4 py-2"
          >
            <option>Reserved</option>
            <option>Borrowed</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 border rounded">
            Cancel
          </button>

          <button
            onClick={() => onSave(form)}
            className="px-4 py-2 bg-yellow-400 text-black font-semibold rounded"
            disabled={
              !form.collaboratorId ||
              !form.partId ||
              !form.expectedReturnDate ||
              hasInvalidQuantity ||
              hasPastExpectedReturnDate
            }
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}



function StatusPill({ status }: { status: RequestStatus }) {
  const statusColors: Record<RequestStatus, { bg: string; text: string }> = {
    Pending: { bg: "bg-yellow-100", text: "text-yellow-800" },
    Approved: { bg: "bg-green-100", text: "text-green-800" },
    Rejected: { bg: "bg-red-100", text: "text-red-800" },
    Reserved: { bg: "bg-orange-100", text: "text-orange-800" },
    Borrowed: { bg: "bg-blue-100", text: "text-blue-800" },
    "Return Pending": { bg: "bg-purple-100", text: "text-purple-800" },
    Returned: { bg: "bg-green-100", text: "text-green-800" },
    Damaged: { bg: "bg-red-100", text: "text-red-800" },
    Cancelled: { bg: "bg-gray-100", text: "text-gray-800" },
  }

  const colors = statusColors[status] || statusColors.Pending

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${colors.bg} ${colors.text}`}>
      {status}
    </span>
  )
}

function ActionCommentModal({
  title,
  message,
  confirmLabel,
  isCommentRequired = false,
  tone,
  onClose,
  onConfirm,
}: {
  title: string
  message: string
  confirmLabel: string
  isCommentRequired?: boolean
  tone?: "yellow" | "green" | "red"
  onClose: () => void
  onConfirm: (comment: string) => void | Promise<void>
}) {
  const [comment, setComment] = useState("")
  const normalizedLabel = confirmLabel.toLowerCase()
  const effectiveTone =
    tone ||
    (normalizedLabel.includes("reject") || normalizedLabel.includes("damage")
      ? "red"
      : normalizedLabel.includes("return")
        ? "green"
        : "yellow")
  const toneClasses = {
    yellow: "bg-yellow-400 text-black hover:bg-yellow-500",
    green: "bg-green-600 text-white hover:bg-green-700",
    red: "bg-red-600 text-white hover:bg-red-700",
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-[450px]">
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-gray-600 mb-6">{message}</p>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a comment..."
          className="w-full border rounded px-4 py-2 mb-6 h-24 resize-none"
        />

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm(comment)
              onClose()
            }}
            disabled={isCommentRequired && !comment.trim()}
            className={`px-4 py-2 rounded font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${toneClasses[effectiveTone]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function RequestDetailsModal({
  request,
  canManage = false,
  onClose,
  onApprove,
  onReject,
}: {
  request: RequestDetailsItem
  canManage?: boolean
  onClose: () => void
  onApprove?: (comment: string) => void | Promise<void>
  onReject?: (comment: string) => void | Promise<void>
}) {
  const [showApproveComment, setShowApproveComment] = useState(false)
  const [showRejectComment, setShowRejectComment] = useState(false)
  const isMissing = isMissingItemRequest(request)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-[600px] max-h-[80vh] overflow-y-auto">
        <h3 className="text-2xl font-bold mb-6">Request Details</h3>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {isMissing ? (
            <>
              <div>
                <p className="text-sm text-gray-600">Item Name</p>
                <p className="font-semibold">{request.itemName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Category</p>
                <p className="font-semibold">{request.category || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Quantity Needed</p>
                <p className="font-semibold">{request.quantityNeeded}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Needed Date</p>
                <p className="font-semibold">{request.neededDate}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Manufacturer</p>
                <p className="font-semibold">{request.manufacturer || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Reference</p>
                <p className="font-semibold">{request.reference || "N/A"}</p>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-sm text-gray-600">Part</p>
                <p className="font-semibold">{request.part?.name || "Unknown"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Type</p>
                <p className="font-semibold">{request.requestType}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Quantity</p>
                <p className="font-semibold">{request.quantity}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Due Date</p>
                <p className="font-semibold">{request.dueDate}</p>
              </div>
            </>
          )}

          <div>
            <p className="text-sm text-gray-600">Collaborator</p>
            <p className="font-semibold">{request.collaborator?.name || "Unknown"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <p className="font-semibold">
              <StatusPill status={request.status} />
            </p>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-sm text-gray-600">Reason</p>
          <p className="font-semibold break-words">{request.reason || "-"}</p>
        </div>

        {request.managerComment && (
          <div className="mb-6">
            <p className="text-sm text-gray-600">Manager Comment</p>
            <p className="font-semibold break-words">{request.managerComment}</p>
          </div>
        )}

        <div className="flex justify-end gap-3">
          {canManage && request.status === "Pending" && (
            <>
              <button
                onClick={() => setShowRejectComment(true)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Reject
              </button>
              <button
                onClick={() => setShowApproveComment(true)}
                className="px-4 py-2 bg-yellow-400 text-black font-semibold rounded hover:bg-yellow-500"
              >
                Approve
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>

      {showApproveComment && onApprove && (
        <ActionCommentModal
          title="Approve Request"
          message="Add approval comment (optional)"
          confirmLabel="Approve"
          tone="yellow"
          onClose={() => setShowApproveComment(false)}
          onConfirm={(comment) => {
            onApprove(comment)
            onClose()
          }}
        />
      )}

      {showRejectComment && onReject && (
        <ActionCommentModal
          title="Reject Request"
          message="Add rejection reason (optional)"
          confirmLabel="Reject"
          tone="red"
          onClose={() => setShowRejectComment(false)}
          onConfirm={(comment) => {
            onReject(comment)
            onClose()
          }}
        />
      )}
    </div>
  )
}

function ConfirmReturnModal({
  request,
  onClose,
  onConfirm,
}: {
  request: PartRequest
  onClose: () => void
  onConfirm: (input: {
    confirmedGoodQuantity: number
    confirmedDamagedQuantity: number
    managerComment: string
  }) => void | Promise<void>
}) {
  const [goodQuantity, setGoodQuantity] = useState(request.quantity)
  const [damagedQuantity, setDamagedQuantity] = useState(0)
  const [comment, setComment] = useState("")
  const totalQuantity = goodQuantity + damagedQuantity

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-[450px]">
        <h3 className="text-xl font-bold mb-4">Confirm Return</h3>

        <div className="mb-4 p-4 bg-gray-50 rounded">
          <p className="text-sm text-gray-600">
            Total quantity to return: <span className="font-semibold">{request.quantity}</span>
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1">Good Quantity</label>
            <input
              type="number"
              min={0}
              max={request.quantity}
              value={goodQuantity}
              onChange={(e) => setGoodQuantity(Math.max(0, Math.min(request.quantity, Number(e.target.value))))}
              className="w-full border rounded px-4 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Damaged Quantity</label>
            <input
              type="number"
              min={0}
              max={request.quantity}
              value={damagedQuantity}
              onChange={(e) =>
                setDamagedQuantity(Math.max(0, Math.min(request.quantity - goodQuantity, Number(e.target.value))))
              }
              className="w-full border rounded px-4 py-2"
            />
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add return notes..."
            className="w-full border rounded px-4 py-2 h-20 resize-none"
          />
        </div>

        {totalQuantity !== request.quantity && (
          <p className="text-sm text-red-600 mb-4">
            Total returned ({totalQuantity}) does not match requested quantity ({request.quantity})
          </p>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm({
                confirmedGoodQuantity: goodQuantity,
                confirmedDamagedQuantity: damagedQuantity,
                managerComment: comment,
              })
              onClose()
            }}
            disabled={totalQuantity !== request.quantity}
            className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700"
          >
            Confirm Return
          </button>
        </div>
      </div>
    </div>
  )
}

function ReturnReportModal({
  request,
  onClose,
}: {
  request: PartRequest
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-[600px]">
        <h3 className="text-2xl font-bold mb-6">Return Report</h3>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-600">Part</p>
            <p className="font-semibold">{request.part?.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Collaborator</p>
            <p className="font-semibold">{request.collaborator?.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Original Quantity</p>
            <p className="font-semibold">{request.quantity}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <p className="font-semibold">
              <StatusPill status={request.status} />
            </p>
          </div>
        </div>

        {request.returnDeclaredAt && (
          <div className="mb-4 p-4 bg-blue-50 rounded">
            <p className="text-sm text-gray-600">Return Declared At</p>
            <p className="font-semibold">{new Date(request.returnDeclaredAt).toLocaleString()}</p>
            {request.returnDeclaredGoodQuantity !== undefined && (
              <>
                <p className="text-sm text-gray-600 mt-2">Declared Good: {request.returnDeclaredGoodQuantity}</p>
                <p className="text-sm text-gray-600">Declared Damaged: {request.returnDeclaredDamagedQuantity}</p>
              </>
            )}
          </div>
        )}

        {request.returnConfirmedAt && (
          <div className="mb-4 p-4 bg-green-50 rounded">
            <p className="text-sm text-gray-600">Return Confirmed At</p>
            <p className="font-semibold">{new Date(request.returnConfirmedAt).toLocaleString()}</p>
            {request.returnConfirmedGoodQuantity !== undefined && (
              <>
                <p className="text-sm text-gray-600 mt-2">Confirmed Good: {request.returnConfirmedGoodQuantity}</p>
                <p className="text-sm text-gray-600">Confirmed Damaged: {request.returnConfirmedDamagedQuantity}</p>
              </>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export function MissingItemRequestModal({
  initialValues,
  lockIdentityFields = false,
  inventoryCategories = missingItemCategories,
  onClose,
  onSave,
}: {
  initialValues?: Partial<MissingItemRequestInput>
  lockIdentityFields?: boolean
  inventoryCategories?: string[]
  onClose: () => void
  onSave: (input: MissingItemRequestInput) => string | null | void | Promise<string | null | void>
}) {
  const [form, setForm] = useState({
    partId: initialValues?.partId ?? null,
    itemName: initialValues?.itemName ?? "",
    category: initialValues?.category ?? "",
    manufacturer: initialValues?.manufacturer ?? "",
    reference: initialValues?.reference ?? "",
    quantityNeeded: initialValues?.quantityNeeded ?? 1,
    reason: initialValues?.reason ?? "",
    neededDate: initialValues?.neededDate ?? "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const baseCategoryOptions = [...new Set([...inventoryCategories, "Other"])]
  const categoryOptions =
    form.category && !baseCategoryOptions.includes(form.category)
      ? [form.category, ...baseCategoryOptions]
      : baseCategoryOptions

  function validate() {
    const nextErrors: Record<string, string> = {}

    if (!form.itemName.trim()) {
      nextErrors.itemName = "Item name is required"
    }
    if (!form.category) {
      nextErrors.category = "Category is required"
    }
    if (!Number.isInteger(Number(form.quantityNeeded)) || form.quantityNeeded < 1) {
      nextErrors.quantityNeeded = "Quantity must be at least 1"
    }
    if (!form.neededDate) {
      nextErrors.neededDate = "Needed date is required"
    } else if (isPastDate(form.neededDate)) {
      nextErrors.neededDate = "Needed date cannot be in the past"
    }
    if (!form.reason.trim()) {
      nextErrors.reason = "Reason is required"
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function submit() {
    setSubmitError("")
    if (!validate()) {
      return
    }

    setIsSubmitting(true)
    const error = await onSave({
      ...form,
      itemName: form.itemName.trim(),
      manufacturer: form.manufacturer.trim(),
      reference: form.reference.trim(),
      reason: form.reason.trim(),
    })
    setIsSubmitting(false)

    if (error) {
      setSubmitError(error)
      return
    }

    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-[500px]">
        <h3 className="text-2xl font-bold mb-6">Request Missing Item</h3>

        <div className="space-y-4 mb-6">
          <div>
            <input
              type="text"
              placeholder="Item Name"
              value={form.itemName}
              readOnly={lockIdentityFields}
              onChange={(e) => setForm({ ...form, itemName: e.target.value })}
              className="w-full border rounded px-4 py-2 read-only:cursor-not-allowed read-only:bg-gray-100 read-only:text-gray-600"
            />
            {errors.itemName && <p className="mt-1 text-sm text-red-600">{errors.itemName}</p>}
          </div>

          <div>
            <select
              value={form.category}
              disabled={lockIdentityFields}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full border rounded px-4 py-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-600"
            >
              <option value="">Select category</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
          </div>

          <input
            type="text"
            placeholder="Manufacturer (optional)"
            value={form.manufacturer}
            readOnly={lockIdentityFields}
            onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
            className="w-full border rounded px-4 py-2 read-only:cursor-not-allowed read-only:bg-gray-100 read-only:text-gray-600"
          />

          <input
            type="text"
            placeholder="Reference (optional)"
            value={form.reference}
            readOnly={lockIdentityFields}
            onChange={(e) => setForm({ ...form, reference: e.target.value })}
            className="w-full border rounded px-4 py-2 read-only:cursor-not-allowed read-only:bg-gray-100 read-only:text-gray-600"
          />

          <div>
            <input
              type="number"
              min={1}
              placeholder="Quantity Needed"
              value={form.quantityNeeded}
              onChange={(e) => setForm({ ...form, quantityNeeded: Number(e.target.value) })}
              className="w-full border rounded px-4 py-2"
            />
            {errors.quantityNeeded && <p className="mt-1 text-sm text-red-600">{errors.quantityNeeded}</p>}
          </div>

          <div>
            <input
              type="date"
              min={getTodayDate()}
              value={form.neededDate}
              onChange={(e) => setForm({ ...form, neededDate: e.target.value })}
              className="w-full border rounded px-4 py-2"
            />
            {errors.neededDate && <p className="mt-1 text-sm text-red-600">{errors.neededDate}</p>}
          </div>

          <div>
            <textarea
              placeholder="Reason for request"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="w-full border rounded px-4 py-2 h-20 resize-none"
            />
            {errors.reason && <p className="mt-1 text-sm text-red-600">{errors.reason}</p>}
          </div>
        </div>

        {submitError && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={isSubmitting}
            className="px-4 py-2 bg-yellow-400 text-black font-semibold rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-yellow-500"
          >
            {isSubmitting ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </div>
    </div>
  )
}

function DeclareReturnModal({
  request,
  onClose,
  onDeclare,
}: {
  request: PartRequest
  onClose: () => void
  onDeclare: (input: {
    goodQuantity: number
    damagedQuantity: number
    comment: string
  }) => void | Promise<void>
}) {
  const [goodQuantity, setGoodQuantity] = useState(request.quantity)
  const [damagedQuantity, setDamagedQuantity] = useState(0)
  const [comment, setComment] = useState("")
  const totalQuantity = goodQuantity + damagedQuantity

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-[450px]">
        <h3 className="text-xl font-bold mb-4">Declare Return</h3>

        <div className="mb-4 p-4 bg-gray-50 rounded">
          <p className="text-sm text-gray-600">
            Item: <span className="font-semibold">{request.part?.name}</span>
          </p>
          <p className="text-sm text-gray-600">
            Total quantity borrowed: <span className="font-semibold">{request.quantity}</span>
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1">Good Quantity</label>
            <input
              type="number"
              min={0}
              max={request.quantity}
              value={goodQuantity}
              onChange={(e) =>
                setGoodQuantity(Math.max(0, Math.min(request.quantity, Number(e.target.value))))
              }
              className="w-full border rounded px-4 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Damaged Quantity</label>
            <input
              type="number"
              min={0}
              max={request.quantity - goodQuantity}
              value={damagedQuantity}
              onChange={(e) =>
                setDamagedQuantity(Math.max(0, Math.min(request.quantity - goodQuantity, Number(e.target.value))))
              }
              className="w-full border rounded px-4 py-2"
            />
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add comments about the return..."
            className="w-full border rounded px-4 py-2 h-20 resize-none"
          />
        </div>

        {totalQuantity !== request.quantity && (
          <p className="text-sm text-red-600 mb-4">
            Total ({totalQuantity}) does not match borrowed quantity ({request.quantity})
          </p>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onDeclare({
                goodQuantity,
                damagedQuantity,
                comment,
              })
              onClose()
            }}
            disabled={totalQuantity !== request.quantity}
            className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700"
          >
            Declare Return
          </button>
        </div>
      </div>
    </div>
  )
}

function getActionCommentConfig(
  action: "approve" | "reject" | "return" | "mark-damaged"
): {
  title: string
  message: string
  confirmLabel: string
  isCommentRequired: boolean
} {
  switch (action) {
    case "approve":
      return {
        title: "Approve Request",
        message: "Add approval comment (optional)",
        confirmLabel: "Approve",
        isCommentRequired: false,
      }
    case "reject":
      return {
        title: "Reject Request",
        message: "Please provide a reason for rejection",
        confirmLabel: "Reject",
        isCommentRequired: true,
      }
    case "return":
      return {
        title: "Mark as Returned",
        message: "Add return notes (optional)",
        confirmLabel: "Mark Returned",
        isCommentRequired: false,
      }
    case "mark-damaged":
      return {
        title: "Mark as Damaged",
        message: "Add damage notes (optional)",
        confirmLabel: "Mark Damaged",
        isCommentRequired: false,
      }
    default:
      return {
        title: "Confirm Action",
        message: "Add a comment",
        confirmLabel: "Confirm",
        isCommentRequired: false,
      }
  }
}
