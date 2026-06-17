import { useEffect, useState } from "react"
import {
  endpoints,
  notificationSummaryEndpoint,
} from "../shared/api/endpoints"
import {
  hasRole,
} from "../shared/utils/permissions"
import type { Purchase } from "../features/purchases/purchasesTypes"
import { PurchasesPage } from "../features/purchases/PurchasesPage"
import type { Part } from "../features/inventory/inventoryTypes"
import { InventoryPage } from "../features/inventory/InventoryPage"
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
} from "../features/requests/requestsTypes"
import { RequestsPage } from "../features/requests/RequestsPage"
import { MyRequestsPage } from "../features/requests/MyRequestsPage"
import { ReservationsPage } from "../features/reservations/ReservationsPage"
import type { AnalyticsSummary } from "../features/analytics/analyticsTypes"
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
import { AppLayout } from "./layout/AppLayout"
import { Header } from "./layout/Header"
import { Sidebar } from "./layout/Sidebar"
import { SidebarSection as SidebarNavigation } from "./layout/SidebarSection"
import { getVisiblePages } from "./routes"
import { configureApiClient } from "../services/api/client"
import { inventoryApi } from "../services/api/inventoryApi"
import { collaboratorApi } from "../services/api/collaboratorApi"
import { reservationApi } from "../services/api/reservationApi"
import { requestApi } from "../services/api/requestApi"

const ANALYTICS_API_URL = endpoints.analyticsSummary
const USERS_API_URL = endpoints.users
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
    imageData: part.imageData || "",
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
    lateReturnPenaltyStars: 0.5,
    damagedItemPenaltyStars: 1,
    stockLocations: [
      "Office",
      "Laboratory",
      "Room 1",
      "Cabinet C1",
      "Cabinet C2",
      "Receiving Area",
    ],
    inventoryCategories: [
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
    ],
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

  useEffect(() => {
    configureApiClient(
      () => authToken || localStorage.getItem("stockdashboard_token"),
      () => handleLogout("Your session has expired. Please log in again.")
    )
  }, [authToken])

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

      const data = await inventoryApi.list()
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

      setCollaborators(await collaboratorApi.list())
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

      setReservations(await reservationApi.list())
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

      const mine = currentUser?.role === "Collaborator"
      const [requests, missingRequests] = await Promise.all([
        requestApi.list(mine),
        requestApi.listMissing(mine),
      ])

      setPartRequests(requests)
      setMissingItemRequests(missingRequests)
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

      const data = (await response.json()) as Partial<AppSettings>
      setAppSettings((current) => ({
        ...current,
        ...data,
        stockLocations: data.stockLocations?.length
          ? data.stockLocations
          : current.stockLocations,
        inventoryCategories: data.inventoryCategories?.length
          ? data.inventoryCategories
          : current.inventoryCategories,
      }))
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
              stockLocations={appSettings.stockLocations}
              inventoryCategories={appSettings.inventoryCategories}
            />
          )}
          {activeVisiblePage === "Reservations" && (
            <ReservationsPage
              parts={parts}
              collaborators={collaborators}
              partRequests={partRequests}
              isLoadingReservations={isLoadingReservations}
              reservationsError={reservationsError}
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
              reloadParts={loadParts}
              reloadPurchases={loadPurchases}
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
                reloadRequests={loadRequests}
                setRequestsError={setRequestsError}
                highlightTarget={highlightTarget}
                reloadNotificationSummary={loadNotificationSummary}
                inventoryCategories={appSettings.inventoryCategories}
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

export default App
