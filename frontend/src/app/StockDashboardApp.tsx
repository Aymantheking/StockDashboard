import { useEffect, useRef, useState } from "react"
import {
  CheckCircle,
  CircleAlert,
  ClipboardCheck,
  Download,
  Eye,
  FileText,
  FilePlus2,
  Pencil,
  RotateCcw,
  ShoppingCart,
  Trash2,
  UserRoundSearch,
  X,
  XCircle,
} from "lucide-react"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx-js-style"
import {
  endpoints,
  notificationSummaryEndpoint,
} from "../shared/api/endpoints"
import {
  formatRequestedAt,
  getTodayDate,
  isPastDate,
} from "../shared/utils/formatDate"
import {
  addPdfFooter,
  loadLogoDataUrl,
} from "../shared/utils/downloadReports"
import {
  hasRole,
} from "../shared/utils/permissions"
import { isHighlightTarget } from "../shared/utils/navigation"
import { BulkActionBar as BulkToolbar } from "../shared/components/BulkActionBar"
import { ConfirmModal as BulkConfirmModal } from "../shared/components/ConfirmModal"
import { DownloadChoiceModal } from "../shared/components/DownloadChoiceModal"
import { IconButton } from "../shared/components/IconButton"
import { Pagination } from "../shared/components/Pagination"
import { TableTextCell as TextCell } from "../shared/components/TableTextCell"
import { FilterPanel } from "../shared/components/FilterPanel"
import {
  SelectionCell,
  SelectionHeader,
} from "../shared/components/TableSelection"
import { usePageSelection } from "../shared/hooks/usePageSelection"
import { getPageItems } from "../shared/hooks/usePagination"
import {
  applyFilterConditions,
  type FilterCondition,
  type FilterField,
  type FilterMatchMode,
} from "../shared/hooks/useFilters"
import type {
  Purchase,
  PurchasePriority,
} from "../features/purchases/purchasesTypes"
import { PrioritySelector } from "../features/purchases/PrioritySelector"
import { PurchasesPage } from "../features/purchases/PurchasesPage"
import type { Part } from "../features/inventory/inventoryTypes"
import { InventoryPage, type InventoryPageProps } from "../features/inventory/InventoryPage"
import type { Reservation } from "../features/reservations/reservationsTypes"
import type {
  Collaborator,
} from "../features/collaborators/collaboratorsTypes"
import { CollaboratorsPage as Collaborators } from "../features/collaborators/CollaboratorsPage"
import type { Supplier } from "../features/suppliers/suppliersTypes"
import { SuppliersPage } from "../features/suppliers/SuppliersPage"
import type { AppSettings } from "../features/settings/settingsTypes"
import { SettingsPage } from "../features/settings/SettingsPage"
import type {
  MissingItemRequest,
  PartRequest,
  RequestDetailsItem,
  RequestStatus,
} from "../features/requests/requestsTypes"
import type { AnalyticsSummary } from "../features/analytics/analyticsTypes"
import type { ApiFetch } from "../shared/api/apiClient"
import type {
  AuthResponse,
  AuthUser,
} from "../features/auth/authTypes"
import { LoginPage } from "../features/auth/LoginPage"
import { DashboardPage as Dashboard } from "../features/dashboard/DashboardPage"
import { AnalyticsPage as Analytics } from "../features/analytics/AnalyticsPage"
import type {
  NotificationItemSummary,
  NotificationSummary,
} from "../features/notifications/notificationsTypes"
import { NotificationsDropdown as NotificationDropdown } from "../features/notifications/NotificationsDropdown"
import type {
  CollaboratorGroup,
  Division,
} from "../shared/types/organization"
import { AppLayout } from "./layout/AppLayout"
import { Header } from "./layout/Header"
import { Sidebar } from "./layout/Sidebar"
import { SidebarSection as SidebarNavigation } from "./layout/SidebarSection"
import { getVisiblePages } from "./routes"

type BackendReservation = Omit<Reservation, "collaborator" | "partName"> & {
  collaborator?: Collaborator
  part?: Part
}

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

const PARTS_API_URL = endpoints.parts
const COLLABORATORS_API_URL = endpoints.collaborators
const RESERVATIONS_API_URL = endpoints.reservations
const ANALYTICS_API_URL = endpoints.analyticsSummary
const USERS_API_URL = endpoints.users
const REQUESTS_API_URL = endpoints.requests
const MISSING_ITEM_REQUESTS_API_URL = endpoints.missingItemRequests
const SETTINGS_API_URL = endpoints.settings
const PURCHASES_API_URL = endpoints.purchases
const SUPPLIERS_API_URL = endpoints.suppliers
const NOTIFICATIONS_BASE_API_URL = endpoints.notifications
const NOTIFICATIONS_API_URL = notificationSummaryEndpoint

function emptyNotificationSummary(): NotificationSummary {
  return {
    totalUnread: 0,
    counts: {
      pendingUserVerifications: 0,
      pendingPartRequests: 0,
      pendingMissingItemRequests: 0,
      pendingPurchaseRequests: 0,
      pendingReturnConfirmations: 0,
      informationalUpdates: 0,
    },
    pendingUserVerifications: 0,
    pendingPartRequests: 0,
    pendingMissingItemRequests: 0,
    pendingPurchaseRequests: 0,
    pendingReturnConfirmations: 0,
    informationalUpdates: 0,
    items: [],
  }
}

function normalizeNotificationSummary(summary: NotificationSummary) {
  const counts = {
    pendingUserVerifications:
      summary.counts?.pendingUserVerifications ??
      summary.pendingUserVerifications ??
      0,
    pendingPartRequests:
      summary.counts?.pendingPartRequests ?? summary.pendingPartRequests ?? 0,
    pendingMissingItemRequests:
      summary.counts?.pendingMissingItemRequests ??
      summary.pendingMissingItemRequests ??
      0,
    pendingPurchaseRequests:
      summary.counts?.pendingPurchaseRequests ??
      summary.pendingPurchaseRequests ??
      0,
    pendingReturnConfirmations:
      summary.counts?.pendingReturnConfirmations ??
      summary.pendingReturnConfirmations ??
      0,
    informationalUpdates:
      summary.counts?.informationalUpdates ?? summary.informationalUpdates ?? 0,
  }

  return {
    ...summary,
    counts,
    pendingUserVerifications: counts.pendingUserVerifications,
    pendingPartRequests: counts.pendingPartRequests,
    pendingMissingItemRequests: counts.pendingMissingItemRequests,
    pendingPurchaseRequests: counts.pendingPurchaseRequests,
    pendingReturnConfirmations: counts.pendingReturnConfirmations,
    informationalUpdates: counts.informationalUpdates,
    items: summary.items || [],
  }
}

function normalizePart(part: Part): Part {
  const legacyQuantity = Number(part.quantity ?? 0)
  const availableQuantity = Number(part.availableQuantity ?? legacyQuantity)
  const reservedQuantity = Number(part.reservedQuantity ?? 0)
  const borrowedQuantity = Number(part.borrowedQuantity ?? 0)
  const damagedQuantity = Number(part.damagedQuantity ?? 0)
  const totalQuantity = Number(
    part.totalQuantity ??
    availableQuantity + reservedQuantity + borrowedQuantity + damagedQuantity
  )

  return {
    ...part,
    quantity: availableQuantity,
    totalQuantity,
    availableQuantity,
    reservedQuantity,
    borrowedQuantity,
    damagedQuantity,
    manufacturer: part.manufacturer || "",
    location: part.location || "",
    description: part.description || "",
    stockAllocationNote: part.stockAllocationNote || "",
    status: part.status || "",
  }
}

function getStoredUser() {
  const storedUser = localStorage.getItem("stockdashboard_user")

  if (!storedUser) {
    return null
  }

  try {
    return JSON.parse(storedUser) as AuthUser
  } catch {
    localStorage.removeItem("stockdashboard_user")
    return null
  }
}

function App() {
  const [activePage, setActivePage] = useState("Dashboard")
  const [authToken, setAuthToken] = useState(
    () => localStorage.getItem("stockdashboard_token") || ""
  )
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(getStoredUser)
  const [authError, setAuthError] = useState("")
  const [parts, setParts] = useState<Part[]>([])
  const [isLoadingParts, setIsLoadingParts] = useState(true)
  const [partsError, setPartsError] = useState<string | null>(null)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [isLoadingReservations, setIsLoadingReservations] = useState(true)
  const [reservationsError, setReservationsError] = useState<string | null>(
    null
  )
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [isLoadingCollaborators, setIsLoadingCollaborators] = useState(true)
  const [collaboratorsError, setCollaboratorsError] = useState<string | null>(
    null
  )
  const [analyticsSummary, setAnalyticsSummary] =
    useState<AnalyticsSummary | null>(null)
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true)
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)
  const [partRequests, setPartRequests] = useState<PartRequest[]>([])
  const [missingItemRequests, setMissingItemRequests] = useState<
    MissingItemRequest[]
  >([])
  const [isLoadingRequests, setIsLoadingRequests] = useState(true)
  const [requestsError, setRequestsError] = useState<string | null>(null)
  const [users, setUsers] = useState<AuthUser[]>([])
  const [usersError, setUsersError] = useState<string | null>(null)
  const [appSettings, setAppSettings] = useState<AppSettings>({
    lowStockThreshold: 5,
    appName: "Bertrandt Inventory System",
  })
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [settingsSuccess, setSettingsSuccess] = useState("")
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [isLoadingPurchases, setIsLoadingPurchases] = useState(false)
  const [purchasesError, setPurchasesError] = useState<string | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false)
  const [suppliersError, setSuppliersError] = useState<string | null>(null)
  const [notificationSummary, setNotificationSummary] =
    useState<NotificationSummary>(emptyNotificationSummary())
  const [highlightTarget, setHighlightTarget] = useState<{
    targetPage: string
    targetSection?: string
    targetId?: number
  } | null>(null)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => localStorage.getItem("stockdashboard_sidebar_collapsed") === "true"
  )

  useEffect(() => {
    localStorage.setItem(
      "stockdashboard_sidebar_collapsed",
      String(isSidebarCollapsed)
    )
  }, [isSidebarCollapsed])

  function handleLogout(message = "") {
    localStorage.removeItem("stockdashboard_token")
    localStorage.removeItem("stockdashboard_user")
    setAuthToken("")
    setCurrentUser(null)
    setAuthError(message)
    setActivePage("Dashboard")
  }

  function handleLogin(authResponse: AuthResponse) {
    localStorage.setItem("stockdashboard_token", authResponse.accessToken)
    localStorage.setItem("stockdashboard_user", JSON.stringify(authResponse.user))
    setAuthToken(authResponse.accessToken)
    setCurrentUser(authResponse.user)
    setAuthError("")
    setActivePage("Dashboard")
  }

  async function apiFetch(url: string, options: RequestInit = {}) {
    const headers = new Headers(options.headers)
    headers.set("Authorization", `Bearer ${authToken}`)

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (response.status === 401) {
      handleLogout("Your session has expired. Please log in again.")
    }

    return response
  }

  async function loadParts() {
    try {
      setIsLoadingParts(true)
      setPartsError(null)

      const response = await apiFetch(PARTS_API_URL)

      if (!response.ok) {
        throw new Error("Failed to load parts")
      }

      const data = (await response.json()) as Part[]
      setParts(data.map(normalizePart))
    } catch {
      setPartsError("Failed to load parts from backend")
    } finally {
      setIsLoadingParts(false)
    }
  }

  async function loadCollaborators() {
    try {
      setIsLoadingCollaborators(true)
      setCollaboratorsError(null)

      const response = await apiFetch(COLLABORATORS_API_URL)

      if (!response.ok) {
        throw new Error("Failed to load collaborators")
      }

      const data = (await response.json()) as Collaborator[]
      setCollaborators(data)
    } catch {
      setCollaboratorsError("Failed to load collaborators from backend")
    } finally {
      setIsLoadingCollaborators(false)
    }
  }

  async function loadReservations() {
    try {
      setIsLoadingReservations(true)
      setReservationsError(null)

      const response = await apiFetch(RESERVATIONS_API_URL)

      if (!response.ok) {
        throw new Error("Failed to load reservations")
      }

      const data = (await response.json()) as BackendReservation[]
      setReservations(data.map(mapBackendReservation))
    } catch {
      setReservationsError("Failed to load reservations from backend")
    } finally {
      setIsLoadingReservations(false)
    }
  }

  async function loadAnalytics() {
    try {
      setIsLoadingAnalytics(true)
      setAnalyticsError(null)

      const response = await apiFetch(ANALYTICS_API_URL)

      if (!response.ok) {
        throw new Error("Failed to load analytics")
      }

      const data = (await response.json()) as AnalyticsSummary
      setAnalyticsSummary(data)
    } catch {
      setAnalyticsError("Failed to load analytics")
    } finally {
      setIsLoadingAnalytics(false)
    }
  }

  async function loadRequests() {
    try {
      setIsLoadingRequests(true)
      setRequestsError(null)

      const requestsEndpoint =
        currentUser?.role === "Collaborator"
          ? `${REQUESTS_API_URL}/my`
          : REQUESTS_API_URL
      const missingRequestsEndpoint =
        currentUser?.role === "Collaborator"
          ? `${MISSING_ITEM_REQUESTS_API_URL}/my`
          : MISSING_ITEM_REQUESTS_API_URL

      const [requestsResponse, missingRequestsResponse] = await Promise.all([
        apiFetch(requestsEndpoint),
        apiFetch(missingRequestsEndpoint),
      ])

      if (!requestsResponse.ok || !missingRequestsResponse.ok) {
        throw new Error("Failed to load requests")
      }

      setPartRequests((await requestsResponse.json()) as PartRequest[])
      setMissingItemRequests(
        (await missingRequestsResponse.json()) as MissingItemRequest[]
      )
    } catch {
      setRequestsError("Failed to load requests")
    } finally {
      setIsLoadingRequests(false)
    }
  }

  async function loadUsers() {
    if (currentUser?.role !== "Admin") {
      return
    }

    try {
      setUsersError(null)
      const response = await apiFetch(USERS_API_URL)

      if (!response.ok) {
        throw new Error("Failed to load users")
      }

      setUsers((await response.json()) as AuthUser[])
    } catch {
      setUsersError("Failed to load users")
    }
  }

  async function loadSettings() {
    try {
      setSettingsError(null)
      const response = await apiFetch(SETTINGS_API_URL)

      if (!response.ok) {
        throw new Error("Failed to load settings")
      }

      setAppSettings((await response.json()) as AppSettings)
    } catch {
      setSettingsError("Failed to load settings")
    }
  }

  async function loadPurchases() {
    if (
      currentUser?.role !== "Admin" &&
      currentUser?.role !== "Inventory Manager"
    ) {
      return
    }

    try {
      setIsLoadingPurchases(true)
      setPurchasesError(null)
      const response = await apiFetch(PURCHASES_API_URL)

      if (!response.ok) {
        throw new Error("Failed to load purchases")
      }

      setPurchases((await response.json()) as Purchase[])
    } catch {
      setPurchasesError("Failed to load purchases")
    } finally {
      setIsLoadingPurchases(false)
    }
  }

  async function loadSuppliers() {
    if (
      currentUser?.role !== "Admin" &&
      currentUser?.role !== "Inventory Manager"
    ) {
      return
    }

    try {
      setIsLoadingSuppliers(true)
      setSuppliersError(null)
      const response = await apiFetch(SUPPLIERS_API_URL)

      if (!response.ok) {
        throw new Error("Failed to load suppliers")
      }

      setSuppliers((await response.json()) as Supplier[])
    } catch {
      setSuppliersError("Failed to load suppliers")
    } finally {
      setIsLoadingSuppliers(false)
    }
  }

  async function loadNotificationSummary() {
    try {
      const response = await apiFetch(NOTIFICATIONS_API_URL)

      if (!response.ok) {
        throw new Error("Failed to load notifications")
      }

      setNotificationSummary(
        normalizeNotificationSummary((await response.json()) as NotificationSummary)
      )
    } catch {
      setNotificationSummary(emptyNotificationSummary())
    }
  }

  async function markAllNotificationsSeen() {
    try {
      const response = await apiFetch(`${NOTIFICATIONS_BASE_API_URL}/read-all`, {
        method: "PUT",
      })

      if (!response.ok) {
        throw new Error("Failed to mark notifications as seen")
      }

      setNotificationSummary(
        normalizeNotificationSummary((await response.json()) as NotificationSummary)
      )
    } catch {
      await loadNotificationSummary()
    }
  }

  async function markNotificationSeen(notificationId: string) {
    try {
      const response = await apiFetch(
        `${NOTIFICATIONS_BASE_API_URL}/${notificationId}/read`,
        {
          method: "PUT",
        }
      )

      if (!response.ok) {
        throw new Error("Failed to mark notification as read")
      }

      setNotificationSummary(
        normalizeNotificationSummary((await response.json()) as NotificationSummary)
      )
    } catch {
      await loadNotificationSummary()
    }
  }

  async function deleteNotification(notificationId: string) {
    try {
      const response = await apiFetch(
        `${NOTIFICATIONS_BASE_API_URL}/${notificationId}`,
        {
          method: "DELETE",
        }
      )

      if (!response.ok) {
        throw new Error("Failed to delete notification")
      }

      setNotificationSummary(
        normalizeNotificationSummary((await response.json()) as NotificationSummary)
      )
    } catch {
      await loadNotificationSummary()
    }
  }

  async function clearReadNotifications() {
    try {
      const response = await apiFetch(
        `${NOTIFICATIONS_BASE_API_URL}/clear-read`,
        {
          method: "DELETE",
        }
      )

      if (!response.ok) {
        throw new Error("Failed to clear read notifications")
      }

      setNotificationSummary(
        normalizeNotificationSummary((await response.json()) as NotificationSummary)
      )
    } catch {
      await loadNotificationSummary()
    }
  }

  useEffect(() => {
    if (!authToken || !currentUser) {
      return
    }

    loadParts()
    loadSettings()
    loadNotificationSummary()

    if (currentUser.role !== "Viewer") {
      loadRequests()
    }

    if (currentUser.role !== "Collaborator") {
      loadCollaborators()
      loadReservations()
      loadAnalytics()
      loadPurchases()
      loadSuppliers()
    }

    if (currentUser.role === "Admin") {
      loadUsers()
    }
  }, [authToken])

  if (!authToken || !currentUser) {
    return (
      <LoginPage
        authError={authError}
        onLogin={handleLogin}
        setAuthError={setAuthError}
      />
    )
  }

  const pages = getVisiblePages(currentUser)
  const canManageParts = currentUser.role === "Admin"
  const canBuyParts = hasRole(currentUser, ["Admin", "Inventory Manager"])
  const canManageCollaborators = hasRole(currentUser, ["Admin"])
  const canCreateReservations = hasRole(currentUser, [
    "Admin",
    "Inventory Manager",
    "Collaborator",
  ])
  const canManageReservations = hasRole(currentUser, [
    "Admin",
    "Inventory Manager",
  ])
  const canApproveRequests = hasRole(currentUser, ["Admin", "Inventory Manager"])
  const canRequestParts = hasRole(currentUser, ["Collaborator"])
  const canUsePurchases = hasRole(currentUser, ["Admin", "Inventory Manager"])
  const activeVisiblePage = pages.includes(activePage) ? activePage : pages[0]
  const notificationCount = notificationSummary.totalUnread

  function handleNotificationNavigate(item: NotificationItemSummary) {
    if (!item.isRead) {
      void markNotificationSeen(item.id)
    }
    setActivePage(item.targetPage)
    setIsNotificationOpen(false)
    setHighlightTarget({
      targetPage: item.targetPage,
      targetSection: item.targetSection,
      targetId: item.targetId,
    })

    window.setTimeout(() => {
      const targetElement =
        item.targetId !== undefined
          ? document.getElementById(
            `${item.targetSection || item.targetPage}-${item.targetId}`
          )
          : null
      const sectionElement = item.targetSection
        ? document.getElementById(item.targetSection)
        : document.getElementById(item.targetPage)

        ; (targetElement || sectionElement)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        })
    }, 100)
  }

  function toggleNotifications() {
    setIsNotificationOpen(!isNotificationOpen)
  }

  return (
    <AppLayout
      header={
        <Header
          currentUser={currentUser}
          notificationCount={notificationCount}
          onToggleNotifications={toggleNotifications}
          onLogout={handleLogout}
          notifications={
            isNotificationOpen ? (
              <NotificationDropdown
                summary={notificationSummary}
                onNavigate={handleNotificationNavigate}
                onMarkAllSeen={markAllNotificationsSeen}
                onDelete={deleteNotification}
                onClearRead={clearReadNotifications}
              />
            ) : null
          }
        />
      }
      sidebar={
        <Sidebar
          collapsed={isSidebarCollapsed}
          onToggle={() =>
            setIsSidebarCollapsed((collapsed) => !collapsed)
          }
        >
          <SidebarNavigation
            pages={pages}
            activePage={activeVisiblePage}
            onNavigate={setActivePage}
            badgeCounts={getSidebarBadgeCounts(notificationSummary)}
            collapsed={isSidebarCollapsed}
          />
        </Sidebar>
      }
    >
          {activeVisiblePage === "Dashboard" && (
            <Dashboard
              parts={parts}
              reservations={reservations}
              collaborators={collaborators}
              currentUser={currentUser}
              users={users}
              partRequests={partRequests}
              purchases={purchases}
              notificationSummary={notificationSummary}
              analyticsSummary={analyticsSummary}
              isLoadingAnalytics={isLoadingAnalytics}
              analyticsError={analyticsError}
              lowStockThreshold={appSettings.lowStockThreshold}
            />
          )}
          {activeVisiblePage === "Inventory" && (
            <InventoryPage
              parts={parts}
              isLoadingParts={isLoadingParts}
              partsError={partsError}
              apiFetch={apiFetch}
              reloadParts={loadParts}
              reloadAnalytics={loadAnalytics}
              reloadPurchases={loadPurchases}
              setPartsError={setPartsError}
              canManageParts={canManageParts}
              canBuyParts={canBuyParts}
              canRequestParts={canRequestParts}
              reloadRequests={loadRequests}
              reloadNotificationSummary={loadNotificationSummary}
              lowStockThreshold={appSettings.lowStockThreshold}
            />
          )}
          {activeVisiblePage === "Reservations" && (
            <Reservations
              parts={parts}
              collaborators={collaborators}
              partRequests={partRequests}
              isLoadingReservations={isLoadingReservations}
              reservationsError={reservationsError}
              apiFetch={apiFetch}
              reloadParts={loadParts}
              reloadReservations={loadReservations}
              reloadRequests={loadRequests}
              reloadAnalytics={loadAnalytics}
              reloadNotificationSummary={loadNotificationSummary}
              setReservationsError={setReservationsError}
              canCreateReservations={canCreateReservations}
              canManageReservations={canManageReservations}
            />
          )}
          {activeVisiblePage === "Collaborators" && (
            <Collaborators
              collaborators={collaborators}
              isLoadingCollaborators={isLoadingCollaborators}
              collaboratorsError={collaboratorsError}
              partRequests={partRequests}
              users={users}
              apiFetch={apiFetch}
              reloadCollaborators={loadCollaborators}
              reloadAnalytics={loadAnalytics}
              setCollaboratorsError={setCollaboratorsError}
              canManageCollaborators={canManageCollaborators}
              currentUser={currentUser}
            />
          )}
          {activeVisiblePage === "Suppliers" && (
            <SuppliersPage
              suppliers={suppliers}
              isLoadingSuppliers={isLoadingSuppliers}
              suppliersError={suppliersError}
              apiFetch={apiFetch}
              reloadSuppliers={loadSuppliers}
              setSuppliersError={setSuppliersError}
              canEditSuppliers={
                currentUser.role === "Admin" ||
                currentUser.role === "Inventory Manager"
              }
              canDeleteSuppliers={currentUser.role === "Admin"}
            />
          )}
          {activeVisiblePage === "Analytics" && (
            <Analytics
              analyticsSummary={analyticsSummary}
              isLoadingAnalytics={isLoadingAnalytics}
              analyticsError={analyticsError}
              currentUser={currentUser}
              parts={parts}
              partRequests={partRequests}
              missingItemRequests={missingItemRequests}
              purchases={purchases}
              collaborators={collaborators}
              users={users}
              lowStockThreshold={appSettings.lowStockThreshold}
            />
          )}
          {activeVisiblePage === "Requests" && (
            <RequestsPage
              partRequests={partRequests}
              missingItemRequests={missingItemRequests}
              isLoadingRequests={isLoadingRequests}
              requestsError={requestsError}
              apiFetch={apiFetch}
              reloadParts={loadParts}
              reloadRequests={loadRequests}
              reloadAnalytics={loadAnalytics}
              setRequestsError={setRequestsError}
              canApproveRequests={canApproveRequests}
              highlightTarget={highlightTarget}
              reloadNotificationSummary={loadNotificationSummary}
            />
          )}
          {activeVisiblePage === "Purchase" && canUsePurchases && (
            <PurchasesPage
              purchases={purchases}
              suppliers={suppliers}
              users={users}
              isLoadingPurchases={isLoadingPurchases}
              purchasesError={purchasesError}
              currentUser={currentUser}
              apiFetch={apiFetch}
              reloadPurchases={loadPurchases}
              reloadParts={loadParts}
              reloadAnalytics={loadAnalytics}
              setPurchasesError={setPurchasesError}
              highlightTarget={highlightTarget}
              reloadNotificationSummary={loadNotificationSummary}
            />
          )}
          {(activeVisiblePage === "My Requests" ||
            activeVisiblePage === "Notifications") && (
              <MyRequestsPage
                partRequests={partRequests}
                missingItemRequests={missingItemRequests}
                isLoadingRequests={isLoadingRequests}
                requestsError={requestsError}
                apiFetch={apiFetch}
                reloadRequests={loadRequests}
                setRequestsError={setRequestsError}
                highlightTarget={highlightTarget}
                reloadNotificationSummary={loadNotificationSummary}
              />
            )}
          {activeVisiblePage === "Settings" && (
            <SettingsPage
              users={users}
              usersError={usersError}
              apiFetch={apiFetch}
              reloadUsers={loadUsers}
              setUsersError={setUsersError}
              appSettings={appSettings}
              settingsError={settingsError}
              settingsSuccess={settingsSuccess}
              apiReloadSettings={loadSettings}
              setSettingsError={setSettingsError}
              setSettingsSuccess={setSettingsSuccess}
              highlightTarget={highlightTarget}
              reloadNotificationSummary={loadNotificationSummary}
            />
          )}
    </AppLayout>
  )
}

function getSidebarBadgeCounts(summary: NotificationSummary) {
  const counts = summary.counts
  const requestsCount =
    counts.pendingPartRequests +
    counts.pendingMissingItemRequests +
    counts.pendingReturnConfirmations

  return {
    Requests: requestsCount,
    Settings: counts.pendingUserVerifications,
    Purchase: counts.pendingPurchaseRequests,
    "My Requests": summary.totalUnread,
  }
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

function mapBackendReservation(reservation: BackendReservation): Reservation {
  return {
    id: reservation.id,
    collaboratorId: reservation.collaboratorId,
    partId: reservation.partId,
    collaborator: reservation.collaborator?.name || "Unknown collaborator",
    partName: reservation.part?.name || "Unknown part",
    quantity: reservation.quantity,
    expectedReturnDate: reservation.expectedReturnDate,
    status: reservation.status,
  }
}

function RequestsPage({
  partRequests,
  missingItemRequests,
  isLoadingRequests,
  requestsError,
  apiFetch,
  reloadParts,
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
  apiFetch: ApiFetch
  reloadParts: () => Promise<void>
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

      const response = await apiFetch(`${REQUESTS_API_URL}/${id}/${action}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ managerComment }),
      })

      if (!response.ok) {
        throw new Error("Failed to update request")
      }

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

      const response = await apiFetch(
        `${MISSING_ITEM_REQUESTS_API_URL}/${id}/${action}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ managerComment }),
        }
      )

      if (!response.ok) {
        throw new Error("Failed to update missing item request")
      }

      await reloadRequests()
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

      const response = await apiFetch(
        `${REQUESTS_API_URL}/${confirmingReturnRequest.id}/confirm-return`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(input),
        }
      )

      if (!response.ok) {
        throw new Error("Failed to confirm return")
      }

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
    const endpoint =
      bulkRequestAction.target === "part"
        ? REQUESTS_API_URL
        : MISSING_ITEM_REQUESTS_API_URL
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
      const responses = await Promise.all(
        ids.map((id) =>
          apiFetch(`${endpoint}/${id}/${bulkRequestAction.action}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ managerComment }),
          })
        )
      )
      if (responses.some((response) => !response.ok)) {
        throw new Error("Failed to update selected requests")
      }
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
                className="rounded bg-green-600 px-3 py-2 text-sm font-semibold text-white"
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
                            tone="green"
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
                className="rounded bg-green-600 px-3 py-2 text-sm font-semibold text-white"
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
                <td className="px-3 py-4">{request.category}</td>
                <td className="px-3 py-4">{request.manufacturer || "-"}</td>
                <td className="px-3 py-4">{request.reference || "-"}</td>
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
                            tone="green"
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
          tone={bulkRequestAction.action === "approve" ? "green" : "red"}
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

function MyRequestsPage({
  partRequests,
  missingItemRequests,
  isLoadingRequests,
  requestsError,
  apiFetch,
  reloadRequests,
  setRequestsError,
  highlightTarget,
  reloadNotificationSummary,
}: {
  partRequests: PartRequest[]
  missingItemRequests: MissingItemRequest[]
  isLoadingRequests: boolean
  requestsError: string | null
  apiFetch: ApiFetch
  reloadRequests: () => Promise<void>
  setRequestsError: React.Dispatch<React.SetStateAction<string | null>>
  highlightTarget: {
    targetPage: string
    targetSection?: string
    targetId?: number
  } | null
  reloadNotificationSummary: () => Promise<void>
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

  async function handleMissingItemRequest(input: {
    itemName: string
    category: string
    manufacturer: string
    reference: string
    quantityNeeded: number
    reason: string
    neededDate: string
  }) {
    try {
      setRequestsError(null)

      const response = await apiFetch(MISSING_ITEM_REQUESTS_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        throw new Error("Failed to create missing item request")
      }

      await reloadRequests()
      await reloadNotificationSummary()
      setIsMissingItemModalOpen(false)
    } catch {
      setRequestsError("Failed to submit missing item request")
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

      const response = await apiFetch(
        `${REQUESTS_API_URL}/${declaringReturnRequest.id}/declare-return`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(input),
        }
      )

      if (!response.ok) {
        throw new Error("Failed to declare return")
      }

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

function Reservations({
  parts,
  collaborators,
  partRequests,
  isLoadingReservations,
  reservationsError,
  apiFetch,
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
  apiFetch: ApiFetch
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
    const requestType =
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

      const createResponse = await apiFetch(REQUESTS_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      })

      if (!createResponse.ok) {
        throw new Error("Failed to create reservation")
      }

      const createdRequest = (await createResponse.json()) as PartRequest
      const approveResponse = await apiFetch(
        `${REQUESTS_API_URL}/${createdRequest.id}/approve`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            managerComment: "Created directly from Reservations page",
          }),
        }
      )

      if (!approveResponse.ok) {
        throw new Error("Failed to approve reservation")
      }

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

      const response = await apiFetch(`${REQUESTS_API_URL}/${id}/return`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ managerComment }),
      })

      if (!response.ok) {
        throw new Error("Failed to return request")
      }

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
      const responses = await Promise.all(
        eligibleIds.map((id) =>
          apiFetch(`${REQUESTS_API_URL}/${id}/return`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ managerComment }),
          })
        )
      )
      if (responses.some((response) => !response.ok)) {
        throw new Error("Failed to return selected reservations")
      }
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
    Reserved: { bg: "bg-blue-100", text: "text-blue-800" },
    Borrowed: { bg: "bg-indigo-100", text: "text-indigo-800" },
    "Return Pending": { bg: "bg-orange-100", text: "text-orange-800" },
    Returned: { bg: "bg-gray-100", text: "text-gray-800" },
    Damaged: { bg: "bg-red-200", text: "text-red-900" },
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
  onClose,
  onConfirm,
}: {
  title: string
  message: string
  confirmLabel: string
  isCommentRequired?: boolean
  onClose: () => void
  onConfirm: (comment: string) => void | Promise<void>
}) {
  const [comment, setComment] = useState("")

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
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
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
                <p className="font-semibold">{request.category}</p>
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
                <p className="font-semibold">{request.manufacturer || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Reference</p>
                <p className="font-semibold">{request.reference || "-"}</p>
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
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
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

function MissingItemRequestModal({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (input: {
    itemName: string
    category: string
    manufacturer: string
    reference: string
    quantityNeeded: number
    reason: string
    neededDate: string
  }) => void | Promise<void>
}) {
  const [form, setForm] = useState({
    itemName: "",
    category: "",
    manufacturer: "",
    reference: "",
    quantityNeeded: 1,
    reason: "",
    neededDate: "",
  })

  const isValid =
    form.itemName.trim() &&
    form.category &&
    form.quantityNeeded > 0 &&
    form.neededDate &&
    !isPastDate(form.neededDate)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-[500px]">
        <h3 className="text-2xl font-bold mb-6">Request Missing Item</h3>

        <div className="space-y-4 mb-6">
          <input
            type="text"
            placeholder="Item Name"
            value={form.itemName}
            onChange={(e) => setForm({ ...form, itemName: e.target.value })}
            className="w-full border rounded px-4 py-2"
          />

          <input
            type="text"
            placeholder="Category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full border rounded px-4 py-2"
          />

          <input
            type="text"
            placeholder="Manufacturer (optional)"
            value={form.manufacturer}
            onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
            className="w-full border rounded px-4 py-2"
          />

          <input
            type="text"
            placeholder="Reference (optional)"
            value={form.reference}
            onChange={(e) => setForm({ ...form, reference: e.target.value })}
            className="w-full border rounded px-4 py-2"
          />

          <input
            type="number"
            min={1}
            placeholder="Quantity Needed"
            value={form.quantityNeeded}
            onChange={(e) => setForm({ ...form, quantityNeeded: Number(e.target.value) })}
            className="w-full border rounded px-4 py-2"
          />

          <input
            type="date"
            min={getTodayDate()}
            value={form.neededDate}
            onChange={(e) => setForm({ ...form, neededDate: e.target.value })}
            className="w-full border rounded px-4 py-2"
          />

          <textarea
            placeholder="Reason for request"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            className="w-full border rounded px-4 py-2 h-20 resize-none"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(form)
              onClose()
            }}
            disabled={!isValid}
            className="px-4 py-2 bg-yellow-400 text-black font-semibold rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-yellow-500"
          >
            Submit Request
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
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
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

export default App
