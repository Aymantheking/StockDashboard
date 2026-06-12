import type { AnalyticsSummary } from "../analytics/analyticsTypes"
import type { AuthUser } from "../auth/authTypes"
import type { Collaborator } from "../collaborators/collaboratorsTypes"
import type { NotificationSummary } from "../notifications/notificationsTypes"
import type { Part } from "../inventory/inventoryTypes"
import type { Purchase } from "../purchases/purchasesTypes"
import type { PartRequest } from "../requests/requestsTypes"
import type { Reservation } from "../reservations/reservationsTypes"
import { StatCard } from "./DashboardCards"
function getBorrowedPartRanking(reservations: Reservation[]) {
  const borrowedCounts = reservations.reduce<Record<string, number>>(
    (counts, reservation) => {
      if (reservation.status === "Borrowed" || reservation.status === "Returned") {
        counts[reservation.partName] = (counts[reservation.partName] || 0) + 1
      }

      return counts
    },
    {}
  )

  return Object.entries(borrowedCounts)
    .map(([partName, borrowCount]) => ({ partName, borrowCount }))
    .sort((a, b) => b.borrowCount - a.borrowCount)
}

function getCollaboratorStats(
  collaborator: Collaborator,
  reservations: Reservation[]
) {
  const collaboratorReservations = reservations.filter(
    (reservation) => reservation.collaborator === collaborator.name
  )

  return {
    totalReservations: collaboratorReservations.length,
    activeReservations: collaboratorReservations.filter(
      (reservation) => reservation.status !== "Returned"
    ).length,
    borrowedItems: collaboratorReservations.filter(
      (reservation) => reservation.status === "Borrowed"
    ).length,
  }
}

function getMostActiveCollaborator(
  collaborators: Collaborator[],
  reservations: Reservation[]
) {
  return collaborators
    .map((collaborator) => ({
      name: collaborator.name,
      ...getCollaboratorStats(collaborator, reservations),
    }))
    .sort((a, b) => b.totalReservations - a.totalReservations)[0]
}

export function DashboardPage({
  parts,
  reservations,
  collaborators,
  currentUser,
  users,
  partRequests,
  purchases,
  notificationSummary,
  analyticsSummary,
  isLoadingAnalytics,
  analyticsError,
  lowStockThreshold,
}: {
  parts: Part[]
  reservations: Reservation[]
  collaborators: Collaborator[]
  currentUser: AuthUser
  users: AuthUser[]
  partRequests: PartRequest[]
  purchases: Purchase[]
  notificationSummary: NotificationSummary
  analyticsSummary: AnalyticsSummary | null
  isLoadingAnalytics: boolean
  analyticsError: string | null
  lowStockThreshold: number
}) {
  const localTopBorrowedPart = getBorrowedPartRanking(reservations)[0]
  const localMostActiveCollaborator = getMostActiveCollaborator(
    collaborators,
    reservations
  )
  const topBorrowedPart =
    analyticsSummary?.mostBorrowedParts[0] || localTopBorrowedPart
  const mostActiveCollaborator =
    analyticsSummary?.mostActiveCollaborators[0] || null
  const localLowStockAlertCounter = parts.filter(
    (part) =>
      part.availableQuantity > 0 &&
      part.availableQuantity <= lowStockThreshold
  ).length
  const localReservedQuantity = partRequests
    .filter((request) => request.status === "Reserved")
    .reduce((total, request) => total + request.quantity, 0)
  const localBorrowedQuantity = partRequests
    .filter((request) => request.status === "Borrowed")
    .reduce((total, request) => total + request.quantity, 0)
  const managerCount = users.length
    ? users.filter((user) => user.role === "Inventory Manager").length
    : currentUser.role === "Inventory Manager"
      ? 1
      : 0
  const pendingRequests =
    notificationSummary.counts.pendingPartRequests +
    notificationSummary.counts.pendingMissingItemRequests
  const pendingPurchases = purchases.filter(
    (purchase) =>
      purchase.status === "Pending" ||
      purchase.status === "Approved" ||
      purchase.status === "Ordered"
  ).length
  const returnIssues = partRequests.filter(
    (request) =>
      request.status === "Return Pending" || request.status === "Damaged"
  ).length

  return (
    <>
      <h2 className="text-3xl font-bold mb-8">Dashboard Overview</h2>

      {isLoadingAnalytics && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          Loading analytics...
        </div>
      )}

      {analyticsError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6">
          {analyticsError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          label="Total Parts"
          value={String(analyticsSummary?.totalParts ?? parts.length)}
        />
        <StatCard
          label="Available"
          value={String(
            analyticsSummary?.availableParts ??
            parts.reduce((total, part) => total + part.availableQuantity, 0)
          )}
          color="text-green-600"
        />
        <StatCard
          label="Borrowed"
          value={String(
            analyticsSummary?.borrowedParts ??
            localBorrowedQuantity
          )}
          color="text-blue-600"
        />
        <StatCard
          label="Low Stock"
          value={String(
            analyticsSummary?.lowStockParts ?? localLowStockAlertCounter
          )}
          color="text-red-600"
        />
        <StatCard
          label="Reserved"
          value={String(
            analyticsSummary?.reservedParts ??
            localReservedQuantity
          )}
          color="text-orange-600"
        />
        <StatCard
          label="Damaged"
          value={String(
            analyticsSummary?.damagedParts ??
            parts.reduce((total, part) => total + part.damagedQuantity, 0)
          )}
          color="text-red-700"
        />
        <StatCard
          label="Managers"
          value={String(managerCount)}
          color="text-indigo-600"
        />
        <StatCard
          label="Total Collaborators"
          value={String(
            analyticsSummary?.totalCollaborators ?? collaborators.length
          )}
        />
      </div>

      <div className="bg-white rounded-lg shadow p-6 mt-8">
        <h3 className="text-xl font-bold mb-4">Quick Analytics Preview</h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded border border-gray-200 p-4">
            <p className="text-gray-500">Top Borrowed Part</p>
            <h4 className="text-lg font-bold">
              {topBorrowedPart?.partName || "No borrowed parts"}
            </h4>
            <p className="text-sm text-gray-500">
              {topBorrowedPart?.borrowCount || 0} borrows
            </p>
          </div>

          <div className="rounded border border-gray-200 p-4">
            <p className="text-gray-500">Most Active Collaborator</p>
            <h4 className="text-lg font-bold">
              {mostActiveCollaborator?.collaboratorName ||
                localMostActiveCollaborator?.name ||
                "No collaborator activity"}
            </h4>
            <p className="text-sm text-gray-500">
              {mostActiveCollaborator?.reservationCount ||
                localMostActiveCollaborator?.totalReservations ||
                0}{" "}
              reservations
            </p>
          </div>

          <div className="rounded border border-gray-200 p-4">
            <p className="text-gray-500">Low Stock Alerts</p>
            <h4 className="text-lg font-bold text-red-600">
              {analyticsSummary?.lowStockParts ?? localLowStockAlertCounter}
            </h4>
            <p className="text-sm text-gray-500">parts need attention</p>
          </div>

          <div className="rounded border border-gray-200 p-4">
            <p className="text-gray-500">Pending Requests</p>
            <h4 className="text-lg font-bold text-yellow-700">
              {pendingRequests}
            </h4>
            <p className="text-sm text-gray-500">
              part and missing item requests awaiting review
            </p>
          </div>

          <div className="rounded border border-gray-200 p-4">
            <p className="text-gray-500">Pending Purchases</p>
            <h4 className="text-lg font-bold text-blue-700">
              {pendingPurchases}
            </h4>
            <p className="text-sm text-gray-500">
              purchase requests pending or ordered
            </p>
          </div>

          <div
            className={`rounded border p-4 ${returnIssues > 0
              ? "border-red-200 bg-red-50"
              : "border-gray-200"
              }`}
          >
            <p className="text-gray-500">Return Issues</p>
            <h4
              className={`text-lg font-bold ${returnIssues > 0 ? "text-red-700" : "text-green-700"
                }`}
            >
              {returnIssues}
            </h4>
            <p className="text-sm text-gray-500">
              return confirmations or damaged returns
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

