import { useEffect, useState } from "react"
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

type Part = {
  id: number
  name: string
  category: string
  reference: string
  quantity: number
  location: string
  status: string
}

type Reservation = {
  id: number
  collaboratorId: number
  partId: number
  collaborator: string
  partName: string
  quantity: number
  expectedReturnDate: string
  status: "Reserved" | "Borrowed" | "Returned"
}

type BackendReservation = Omit<Reservation, "collaborator" | "partName"> & {
  collaborator?: Collaborator
  part?: Part
}

type Division = "Division 1" | "Division 2" | "Division 3" | "Division 4" | "Admin"

type CollaboratorGroup = "Group 1" | "Group 2" | "Group 3" | "Group 4"

type Collaborator = {
  id: number
  name: string
  email: string
  division: Division
  group: CollaboratorGroup
  role: string
}

type UserRole = "Admin" | "Inventory Manager" | "Collaborator" | "Viewer"

type AuthUser = {
  id: number
  name: string
  email: string
  role: UserRole
  division: Division
  group: CollaboratorGroup
  managedDivision: Division | null
}

type AuthResponse = {
  accessToken: string
  user: AuthUser
}

type ApiFetch = (url: string, options?: RequestInit) => Promise<Response>

type RequestStatus =
  | "Pending"
  | "Approved"
  | "Rejected"
  | "Borrowed"
  | "Reserved"
  | "Returned"
  | "Cancelled"

type PartRequest = {
  id: number
  collaboratorId: number
  partId: number
  quantity: number
  requestType: "Reservation" | "Borrow"
  reason: string
  expectedReturnDate: string
  status: RequestStatus
  managerComment: string
  collaborator?: Collaborator
  part?: Part
}

type MissingItemRequest = {
  id: number
  collaboratorId: number
  itemName: string
  category: string
  manufacturer: string
  reference: string
  quantityNeeded: number
  reason: string
  neededDate: string
  status: RequestStatus
  managerComment: string
  collaborator?: Collaborator
}

type AnalyticsSummary = {
  totalParts: number
  availableParts: number
  borrowedParts: number
  reservedParts: number
  lowStockParts: number
  lowStockItems: Part[]
  totalCollaborators: number
  activeBorrowers: number
  totalReservations: number
  reservedReservations: number
  borrowedReservations: number
  returnedReservations: number
  mostBorrowedParts: { partName: string; borrowCount: number }[]
  mostActiveCollaborators: {
    collaboratorName: string
    reservationCount: number
    borrowedCount: number
  }[]
  inventoryByCategory: { category: string; count: number }[]
  reservationsByDivision: {
    division: Division
    collaborators: number
    reservationCount: number
    activeReservations: number
    borrowedParts: number
  }[]
  borrowedPartsByGroup: {
    group: CollaboratorGroup
    collaborators: number
    reservationCount: number
    activeReservations: number
    borrowedCount: number
    borrowedParts: number
  }[]
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

const chartColors = ["#facc15", "#2563eb", "#16a34a", "#dc2626", "#9333ea"]

const PARTS_API_URL = "http://localhost:3001/parts"
const COLLABORATORS_API_URL = "http://localhost:3001/collaborators"
const RESERVATIONS_API_URL = "http://localhost:3001/reservations"
const ANALYTICS_API_URL = "http://localhost:3001/analytics/summary"
const AUTH_API_URL = "http://localhost:3001/auth"
const USERS_API_URL = "http://localhost:3001/users"
const REQUESTS_API_URL = "http://localhost:3001/requests"
const MISSING_ITEM_REQUESTS_API_URL =
  "http://localhost:3001/missing-item-requests"

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
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [viewedNotifications, setViewedNotifications] = useState<string[]>(() => {
    const storedNotifications = localStorage.getItem(
      "stockdashboard_viewed_notifications"
    )

    return storedNotifications ? JSON.parse(storedNotifications) : []
  })

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
      setParts(data)
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

  useEffect(() => {
    if (!authToken || !currentUser) {
      return
    }

    loadParts()

    if (currentUser.role !== "Viewer") {
      loadRequests()
    }

    if (currentUser.role !== "Collaborator") {
      loadCollaborators()
      loadReservations()
      loadAnalytics()
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
  const canManageParts = hasRole(currentUser, ["Admin", "Inventory Manager"])
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
  const activeVisiblePage = pages.includes(activePage) ? activePage : pages[0]
  const notificationCount = getNotificationCount(
    currentUser,
    partRequests,
    missingItemRequests,
    viewedNotifications
  )
  const notificationIds = getCollaboratorNotificationIds(
    partRequests,
    missingItemRequests
  )

  function toggleNotifications() {
    const willOpen = !isNotificationOpen
    setIsNotificationOpen(willOpen)

    if (willOpen && currentUser?.role === "Collaborator") {
      const nextViewedNotifications = Array.from(
        new Set([...viewedNotifications, ...notificationIds])
      )
      setViewedNotifications(nextViewedNotifications)
      localStorage.setItem(
        "stockdashboard_viewed_notifications",
        JSON.stringify(nextViewedNotifications)
      )
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-black text-white px-6 py-3 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-yellow-400">
          Bertrandt Inventory System
        </h1>

        <div className="relative flex items-center gap-4">
          <button
            onClick={toggleNotifications}
            className="relative rounded-full border border-gray-700 p-2 text-yellow-400 hover:border-yellow-400"
            title="Notifications"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {notificationCount > 0 && (
              <span className="absolute -right-2 -top-2 min-w-5 rounded-full bg-yellow-400 px-1.5 py-0.5 text-xs font-bold text-black">
                {notificationCount}
              </span>
            )}
          </button>

          {isNotificationOpen && (
            <NotificationDropdown
              user={currentUser}
              partRequests={partRequests}
              missingItemRequests={missingItemRequests}
              onNavigate={(page) => {
                setActivePage(page)
                setIsNotificationOpen(false)
              }}
            />
          )}

          <div className="hidden sm:block text-right">
            <p className="text-sm font-semibold">{currentUser.name}</p>
            <p className="text-xs text-gray-300">{currentUser.role}</p>
          </div>

          <button
            onClick={() => handleLogout()}
            className="rounded border border-yellow-400 px-3 py-2 text-sm font-semibold text-yellow-400 hover:bg-yellow-400 hover:text-black"
          >
            Logout
          </button>

          <img
            src="/logo.png"
            alt="Bertrandt"
            className="h-24 w-auto object-contain"
          />
        </div>
      </header>

      <div className="flex">
        <aside className="w-64 min-h-screen bg-gray-900 text-white p-4">
          {pages.map(
            (page) => (
              <button
                key={page}
                onClick={() => setActivePage(page)}
                className={`block w-full text-left px-3 py-3 rounded ${activeVisiblePage === page
                  ? "bg-yellow-400 text-black font-semibold"
                  : "hover:text-yellow-400"
                  }`}
              >
                {page}
              </button>
            )
          )}
        </aside>
        <main className="flex-1 p-8">
          {activeVisiblePage === "Dashboard" && (
            <Dashboard
              parts={parts}
              reservations={reservations}
              collaborators={collaborators}
              analyticsSummary={analyticsSummary}
              isLoadingAnalytics={isLoadingAnalytics}
              analyticsError={analyticsError}
            />
          )}
          {activeVisiblePage === "Inventory" && (
            <Inventory
              parts={parts}
              isLoadingParts={isLoadingParts}
              partsError={partsError}
              apiFetch={apiFetch}
              reloadParts={loadParts}
              reloadAnalytics={loadAnalytics}
              setPartsError={setPartsError}
              canManageParts={canManageParts}
              canRequestParts={canRequestParts}
              reloadRequests={loadRequests}
            />
          )}
          {activeVisiblePage === "Reservations" && (
            <Reservations
              parts={parts}
              collaborators={collaborators}
              reservations={reservations}
              isLoadingReservations={isLoadingReservations}
              reservationsError={reservationsError}
              apiFetch={apiFetch}
              reloadParts={loadParts}
              reloadReservations={loadReservations}
              reloadAnalytics={loadAnalytics}
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
              reservations={reservations}
              apiFetch={apiFetch}
              reloadCollaborators={loadCollaborators}
              reloadAnalytics={loadAnalytics}
              setCollaboratorsError={setCollaboratorsError}
              canManageCollaborators={canManageCollaborators}
            />
          )}
          {activeVisiblePage === "Analytics" && (
            <Analytics
              analyticsSummary={analyticsSummary}
              isLoadingAnalytics={isLoadingAnalytics}
              analyticsError={analyticsError}
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
              />
            )}
          {activeVisiblePage === "Settings" && (
            <SettingsPage
              users={users}
              collaborators={collaborators}
              usersError={usersError}
              apiFetch={apiFetch}
              reloadUsers={loadUsers}
              setUsersError={setUsersError}
            />
          )}
        </main>
      </div>
    </div>
  )
}

function hasRole(user: AuthUser, roles: UserRole[]) {
  return roles.includes(user.role)
}

function getVisiblePages(user: AuthUser) {
  if (user.role === "Collaborator") {
    return ["Inventory", "My Requests"]
  }

  if (user.role === "Admin") {
    return [
      "Dashboard",
      "Inventory",
      "Reservations",
      "Collaborators",
      "Analytics",
      "Requests",
      "Settings",
    ]
  }

  if (user.role === "Inventory Manager") {
    return [
      "Dashboard",
      "Inventory",
      "Reservations",
      "Collaborators",
      "Analytics",
      "Requests",
    ]
  }

  return ["Dashboard", "Inventory", "Reservations", "Analytics"]
}

function LoginPage({
  authError,
  onLogin,
  setAuthError,
}: {
  authError: string
  onLogin: (authResponse: AuthResponse) => void
  setAuthError: React.Dispatch<React.SetStateAction<string>>
}) {
  const [email, setEmail] = useState("admin@stockdashboard.local")
  const [password, setPassword] = useState("admin123")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      setIsSubmitting(true)
      setAuthError("")

      const response = await fetch(`${AUTH_API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        throw new Error("Login failed")
      }

      const authResponse = (await response.json()) as AuthResponse
      onLogin(authResponse)
    } catch {
      setAuthError("Invalid email or password. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Stock Dashboard</h1>
            <p className="text-sm text-gray-500">Local access</p>
          </div>

          <img
            src="/logo.png"
            alt="Bertrandt"
            className="h-12 w-auto object-contain"
          />
        </div>

        {authError && (
          <div className="mb-5 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {authError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded border border-gray-300 px-4 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded border border-gray-300 px-4 py-2"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded bg-yellow-400 px-4 py-2 font-semibold text-black disabled:opacity-60"
          >
            {isSubmitting ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  )
}

function getCollaboratorNotificationIds(
  partRequests: PartRequest[],
  missingItemRequests: MissingItemRequest[]
) {
  const partNotificationIds = partRequests
    .filter((request) => request.status === "Reserved" || request.status === "Borrowed" || request.status === "Rejected")
    .map((request) => `part-${request.id}-${request.status}`)
  const missingNotificationIds = missingItemRequests
    .filter((request) => request.status === "Approved" || request.status === "Rejected")
    .map((request) => `missing-${request.id}-${request.status}`)

  return [...partNotificationIds, ...missingNotificationIds]
}

function getNotificationCount(
  user: AuthUser,
  partRequests: PartRequest[],
  missingItemRequests: MissingItemRequest[],
  viewedNotifications: string[]
) {
  if (user.role === "Admin" || user.role === "Inventory Manager") {
    return (
      partRequests.filter((request) => request.status === "Pending").length +
      missingItemRequests.filter((request) => request.status === "Pending").length
    )
  }

  if (user.role === "Collaborator") {
    return getCollaboratorNotificationIds(partRequests, missingItemRequests).filter(
      (notificationId) => !viewedNotifications.includes(notificationId)
    ).length
  }

  return 0
}

function NotificationDropdown({
  user,
  partRequests,
  missingItemRequests,
  onNavigate,
}: {
  user: AuthUser
  partRequests: PartRequest[]
  missingItemRequests: MissingItemRequest[]
  onNavigate: (page: string) => void
}) {
  const isManagerView = user.role === "Admin" || user.role === "Inventory Manager"
  const managerPartRequests = partRequests.filter(
    (request) => request.status === "Pending"
  )
  const managerMissingRequests = missingItemRequests.filter(
    (request) => request.status === "Pending"
  )
  const collaboratorPartRequests = partRequests.filter(
    (request) =>
      request.status === "Reserved" ||
      request.status === "Borrowed" ||
      request.status === "Rejected"
  )
  const collaboratorMissingRequests = missingItemRequests.filter(
    (request) => request.status === "Approved" || request.status === "Rejected"
  )

  return (
    <div className="absolute right-0 top-14 z-20 w-96 rounded-lg bg-white p-4 text-black shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-bold">Notifications</h3>
        <button
          onClick={() => onNavigate(isManagerView ? "Requests" : "My Requests")}
          className="text-sm font-semibold text-yellow-700"
        >
          {isManagerView ? "Open Requests" : "Open My Requests"}
        </button>
      </div>

      <div className="max-h-80 space-y-3 overflow-y-auto">
        {isManagerView ? (
          <>
            {managerPartRequests.map((request) => (
              <NotificationItem
                key={`part-${request.id}`}
                title={request.part?.name || "Part request"}
                meta={`${request.collaborator?.name || "Collaborator"} - Pending`}
                comment={request.reason}
              />
            ))}
            {managerMissingRequests.map((request) => (
              <NotificationItem
                key={`missing-${request.id}`}
                title={request.itemName}
                meta={`${request.collaborator?.name || "Collaborator"} - Missing item pending`}
                comment={request.reason}
              />
            ))}
            {managerPartRequests.length + managerMissingRequests.length === 0 && (
              <p className="py-6 text-center text-sm text-gray-500">
                No pending requests.
              </p>
            )}
          </>
        ) : (
          <>
            {collaboratorPartRequests.map((request) => (
              <NotificationItem
                key={`part-${request.id}`}
                title={request.part?.name || "Part request"}
                meta={`${request.status} - ${request.requestType}`}
                comment={request.managerComment || "No manager comment yet."}
              />
            ))}
            {collaboratorMissingRequests.map((request) => (
              <NotificationItem
                key={`missing-${request.id}`}
                title={request.itemName}
                meta={`Missing item ${request.status}`}
                comment={request.managerComment || "No manager comment yet."}
              />
            ))}
            {collaboratorPartRequests.length +
              collaboratorMissingRequests.length ===
              0 && (
                <p className="py-6 text-center text-sm text-gray-500">
                  No request updates yet.
                </p>
              )}
          </>
        )}
      </div>
    </div>
  )
}

function NotificationItem({
  title,
  meta,
  comment,
}: {
  title: string
  meta: string
  comment: string
}) {
  return (
    <div className="rounded border border-gray-200 p-3">
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-gray-600">{meta}</p>
      <p className="mt-1 text-sm text-gray-500">{comment}</p>
    </div>
  )
}

function getLowStockParts(parts: Part[]) {
  return parts.filter((part) => part.status === "Low Stock" || part.quantity <= 5)
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

function getActiveBorrowers(
  collaborators: Collaborator[],
  reservations: Reservation[]
) {
  return collaborators.filter(
    (collaborator) =>
      getCollaboratorStats(collaborator, reservations).borrowedItems > 0
  ).length
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

function Dashboard({
  parts,
  reservations,
  collaborators,
  analyticsSummary,
  isLoadingAnalytics,
  analyticsError,
}: {
  parts: Part[]
  reservations: Reservation[]
  collaborators: Collaborator[]
  analyticsSummary: AnalyticsSummary | null
  isLoadingAnalytics: boolean
  analyticsError: string | null
}) {
  const localBorrowedReservations = reservations.filter(
    (reservation) => reservation.status === "Borrowed"
  ).length
  const localReservedReservations = reservations.filter(
    (reservation) => reservation.status === "Reserved"
  ).length
  const localTopBorrowedPart = getBorrowedPartRanking(reservations)[0]
  const localMostActiveCollaborator = getMostActiveCollaborator(
    collaborators,
    reservations
  )
  const topBorrowedPart =
    analyticsSummary?.mostBorrowedParts[0] || localTopBorrowedPart
  const mostActiveCollaborator =
    analyticsSummary?.mostActiveCollaborators[0] || null
  const localLowStockAlertCounter = getLowStockParts(parts).length

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
            parts.filter((p) => p.status === "Available").length
          )}
          color="text-green-600"
        />
        <StatCard
          label="Borrowed"
          value={String(analyticsSummary?.borrowedParts ?? localBorrowedReservations)}
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
          label="Borrowed Reservations"
          value={String(
            analyticsSummary?.borrowedReservations ?? localBorrowedReservations
          )}
          color="text-blue-600"
        />
        <StatCard
          label="Reserved Reservations"
          value={String(
            analyticsSummary?.reservedReservations ?? localReservedReservations
          )}
          color="text-yellow-600"
        />
        <StatCard
          label="Total Collaborators"
          value={String(
            analyticsSummary?.totalCollaborators ?? collaborators.length
          )}
        />
        <StatCard
          label="Active Borrowers"
          value={String(
            analyticsSummary?.activeBorrowers ??
            getActiveBorrowers(collaborators, reservations)
          )}
          color="text-blue-600"
        />
      </div>

      <div className="bg-white rounded-lg shadow p-6 mt-8">
        <h3 className="text-xl font-bold mb-4">Quick Analytics Preview</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-gray-200 rounded p-4">
            <p className="text-gray-500">Top Borrowed Part</p>
            <h4 className="text-lg font-bold">
              {topBorrowedPart?.partName || "No borrowed parts"}
            </h4>
            <p className="text-sm text-gray-500">
              {topBorrowedPart?.borrowCount || 0} borrows
            </p>
          </div>

          <div className="border border-gray-200 rounded p-4">
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

          <div className="border border-gray-200 rounded p-4">
            <p className="text-gray-500">Low Stock Alerts</p>
            <h4 className="text-lg font-bold text-red-600">
              {analyticsSummary?.lowStockParts ?? localLowStockAlertCounter}
            </h4>
            <p className="text-sm text-gray-500">parts need attention</p>
          </div>
        </div>
      </div>
    </>
  )
}

function Analytics({
  analyticsSummary,
  isLoadingAnalytics,
  analyticsError,
}: {
  analyticsSummary: AnalyticsSummary | null
  isLoadingAnalytics: boolean
  analyticsError: string | null
}) {
  const inventoryByCategory =
    analyticsSummary?.inventoryByCategory.map((category) => ({
      name: category.category,
      value: category.count,
    })) || []
  const divisionAnalytics = analyticsSummary?.reservationsByDivision || []
  const groupAnalytics = analyticsSummary?.borrowedPartsByGroup || []

  if (isLoadingAnalytics) {
    return (
      <>
        <h2 className="text-3xl font-bold mb-8">Analytics</h2>
        <div className="bg-white rounded-lg shadow p-6">Loading analytics...</div>
      </>
    )
  }

  if (analyticsError || !analyticsSummary) {
    return (
      <>
        <h2 className="text-3xl font-bold mb-8">Analytics</h2>
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-6">
          Failed to load analytics
        </div>
      </>
    )
  }

  return (
    <>
      <h2 className="text-3xl font-bold mb-8">Analytics</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <StatCard label="Total Parts" value={String(analyticsSummary.totalParts)} />
        <StatCard
          label="Available Parts"
          value={String(analyticsSummary.availableParts)}
          color="text-green-600"
        />
        <StatCard
          label="Borrowed Parts"
          value={String(analyticsSummary.borrowedParts)}
          color="text-blue-600"
        />
        <StatCard
          label="Reserved Parts"
          value={String(analyticsSummary.reservedParts)}
          color="text-yellow-600"
        />
        <StatCard
          label="Total Collaborators"
          value={String(analyticsSummary.totalCollaborators)}
        />
        <StatCard
          label="Active Borrowers"
          value={String(analyticsSummary.activeBorrowers)}
          color="text-blue-600"
        />
        <StatCard
          label="Low Stock Parts"
          value={String(analyticsSummary.lowStockParts)}
          color="text-red-600"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        <ChartCard title="Inventory by Category">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={inventoryByCategory}
                dataKey="value"
                nameKey="name"
                outerRadius={90}
                label
              >
                {inventoryByCategory.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={chartColors[index % chartColors.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Reservations by Division">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={divisionAnalytics}>
              <XAxis dataKey="division" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="reservationCount" fill="#facc15" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Borrowed Parts by Group">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={groupAnalytics}>
              <XAxis dataKey="group" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="borrowedCount" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AnalyticsTable title="Low Stock Analysis">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b bg-gray-100">
                <th className="text-left py-3 px-2">Part Name</th>
                <th className="text-left py-3 px-2">Category</th>
                <th className="text-left py-3 px-2">Current Quantity</th>
                <th className="text-left py-3 px-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {analyticsSummary.lowStockItems.map((part) => (
                <tr key={part.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-2 font-medium">{part.name}</td>
                  <td className="py-3 px-2">{part.category}</td>
                  <td className="py-3 px-2">{part.quantity}</td>
                  <td className="py-3 px-2">{part.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </AnalyticsTable>

        <AnalyticsTable title="Most Borrowed Parts">
          <table className="w-full min-w-[520px]">
            <thead>
              <tr className="border-b bg-gray-100">
                <th className="text-left py-3 px-2">Rank</th>
                <th className="text-left py-3 px-2">Part Name</th>
                <th className="text-left py-3 px-2">Borrow Count</th>
              </tr>
            </thead>
            <tbody>
              {analyticsSummary.mostBorrowedParts.map((part, index) => (
                <tr key={part.partName} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-2">{index + 1}</td>
                  <td className="py-3 px-2 font-medium">{part.partName}</td>
                  <td className="py-3 px-2">{part.borrowCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </AnalyticsTable>

        <AnalyticsTable title="Most Active Collaborators">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b bg-gray-100">
                <th className="text-left py-3 px-2">Rank</th>
                <th className="text-left py-3 px-2">Collaborator</th>
                <th className="text-left py-3 px-2">Total Reservations</th>
                <th className="text-left py-3 px-2">Borrowed Items</th>
              </tr>
            </thead>
            <tbody>
              {analyticsSummary.mostActiveCollaborators.map((collaborator, index) => (
                <tr
                  key={collaborator.collaboratorName}
                  className="border-b hover:bg-gray-50"
                >
                  <td className="py-3 px-2">{index + 1}</td>
                  <td className="py-3 px-2 font-medium">
                    {collaborator.collaboratorName}
                  </td>
                  <td className="py-3 px-2">
                    {collaborator.reservationCount}
                  </td>
                  <td className="py-3 px-2">{collaborator.borrowedCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </AnalyticsTable>

        <AnalyticsTable title="Division Analytics">
          <table className="w-full min-w-[620px]">
            <thead>
              <tr className="border-b bg-gray-100">
                <th className="text-left py-3 px-2">Division</th>
                <th className="text-left py-3 px-2">Collaborators</th>
                <th className="text-left py-3 px-2">Active Reservations</th>
                <th className="text-left py-3 px-2">Borrowed Parts</th>
              </tr>
            </thead>
            <tbody>
              {divisionAnalytics.map((division) => (
                <tr key={division.division} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-2 font-medium">{division.division}</td>
                  <td className="py-3 px-2">{division.collaborators}</td>
                  <td className="py-3 px-2">{division.activeReservations}</td>
                  <td className="py-3 px-2">{division.borrowedParts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </AnalyticsTable>

        <AnalyticsTable title="Group Analytics">
          <table className="w-full min-w-[620px]">
            <thead>
              <tr className="border-b bg-gray-100">
                <th className="text-left py-3 px-2">Group</th>
                <th className="text-left py-3 px-2">Collaborators</th>
                <th className="text-left py-3 px-2">Active Reservations</th>
                <th className="text-left py-3 px-2">Borrowed Parts</th>
              </tr>
            </thead>
            <tbody>
              {groupAnalytics.map((group) => (
                <tr key={group.group} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-2 font-medium">{group.group}</td>
                  <td className="py-3 px-2">{group.collaborators}</td>
                  <td className="py-3 px-2">{group.activeReservations}</td>
                  <td className="py-3 px-2">{group.borrowedParts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </AnalyticsTable>
      </div>
    </>
  )
}

function Inventory({
  parts,
  isLoadingParts,
  partsError,
  apiFetch,
  reloadParts,
  reloadAnalytics,
  setPartsError,
  canManageParts,
  canRequestParts,
  reloadRequests,
}: {
  parts: Part[]
  isLoadingParts: boolean
  partsError: string | null
  apiFetch: ApiFetch
  reloadParts: () => Promise<void>
  reloadAnalytics: () => Promise<void>
  setPartsError: React.Dispatch<React.SetStateAction<string | null>>
  canManageParts: boolean
  canRequestParts: boolean
  reloadRequests: () => Promise<void>
}) {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("All Categories")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPart, setEditingPart] = useState<Part | null>(null)
  const [requestingPart, setRequestingPart] = useState<Part | null>(null)

  const filteredParts = parts.filter((part) => {
    const matchesSearch =
      part.name.toLowerCase().includes(search.toLowerCase()) ||
      part.reference.toLowerCase().includes(search.toLowerCase())

    const matchesCategory =
      category === "All Categories" || part.category === category

    return matchesSearch && matchesCategory
  })

  async function handleDelete(id: number) {
    try {
      setPartsError(null)

      const response = await apiFetch(`${PARTS_API_URL}/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete part")
      }

      await reloadParts()
      await reloadAnalytics()
    } catch {
      setPartsError("Failed to delete part")
    }
  }

  async function handleSave(part: Part) {
    const { id, ...partPayload } = part

    try {
      setPartsError(null)

      const response = await apiFetch(
        editingPart ? `${PARTS_API_URL}/${id}` : PARTS_API_URL,
        {
          method: editingPart ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(partPayload),
        }
      )

      if (!response.ok) {
        throw new Error(editingPart ? "Failed to update part" : "Failed to create part")
      }

      await reloadParts()
      await reloadAnalytics()
      setIsModalOpen(false)
      setEditingPart(null)
    } catch {
      setPartsError(editingPart ? "Failed to update part" : "Failed to create part")
    }
  }

  async function handleRequestPart(input: {
    partId: number
    quantity: number
    requestType: "Reservation" | "Borrow"
    expectedReturnDate: string
    reason: string
  }) {
    try {
      setPartsError(null)

      const response = await apiFetch(REQUESTS_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        throw new Error("Failed to create request")
      }

      await reloadRequests()
      setRequestingPart(null)
    } catch {
      setPartsError("Failed to submit request")
    }
  }

  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold">Inventory</h2>

        {canManageParts && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-yellow-400 text-black font-semibold px-4 py-2 rounded"
          >
            + Add Part
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {isLoadingParts && (
          <div className="mb-6 rounded border border-gray-200 bg-gray-50 px-4 py-3 text-gray-600">
            Loading parts...
          </div>
        )}

        {partsError && (
          <div className="mb-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {partsError}
          </div>
        )}

        <div className="flex gap-4 mb-6">
          <input
            type="text"
            placeholder="Search by name or reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded px-4 py-2 w-80"
          />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border border-gray-300 rounded px-4 py-2"
          >
            <option>All Categories</option>
            {partCategories.map((categoryName) => (
              <option key={categoryName}>{categoryName}</option>
            ))}
          </select>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-100">
              <th className="text-left py-3 px-2">Name</th>
              <th className="text-left py-3 px-2">Category</th>
              <th className="text-left py-3 px-2">Reference</th>
              <th className="text-left py-3 px-2">Qty</th>
              <th className="text-left py-3 px-2">Location</th>
              <th className="text-left py-3 px-2">Status</th>
              {(canManageParts || canRequestParts) && (
                <th className="text-left py-3 px-2">Actions</th>
              )}
            </tr>
          </thead>

          <tbody>
            {filteredParts.map((part) => (
              <tr key={part.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-2 font-medium">{part.name}</td>
                <td className="py-3 px-2">{part.category}</td>
                <td className="py-3 px-2">{part.reference}</td>
                <td className="py-3 px-2">{part.quantity}</td>
                <td className="py-3 px-2">{part.location}</td>
                <td className="py-3 px-2">{part.status}</td>
                {(canManageParts || canRequestParts) && (
                  <td className="py-3 px-2 space-x-2">
                    {canManageParts && (
                      <>
                        <button
                          onClick={() => {
                            setEditingPart(part)
                            setIsModalOpen(true)
                          }}
                          className="text-blue-600"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleDelete(part.id)}
                          className="text-red-600"
                        >
                          Delete
                        </button>
                      </>
                    )}

                    {canRequestParts && part.quantity > 0 && (
                      <button
                        onClick={() => setRequestingPart(part)}
                        className="text-yellow-700 font-semibold"
                      >
                        Request
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <PartModal
          part={editingPart}
          onClose={() => {
            setIsModalOpen(false)
            setEditingPart(null)
          }}
          onSave={handleSave}
        />
      )}

      {requestingPart && (
        <PartRequestModal
          part={requestingPart}
          onClose={() => setRequestingPart(null)}
          onSave={handleRequestPart}
        />
      )}
    </>
  )
}

function Collaborators({
  collaborators,
  isLoadingCollaborators,
  collaboratorsError,
  reservations,
  apiFetch,
  reloadCollaborators,
  reloadAnalytics,
  setCollaboratorsError,
  canManageCollaborators,
}: {
  collaborators: Collaborator[]
  isLoadingCollaborators: boolean
  collaboratorsError: string | null
  reservations: Reservation[]
  apiFetch: ApiFetch
  reloadCollaborators: () => Promise<void>
  reloadAnalytics: () => Promise<void>
  setCollaboratorsError: React.Dispatch<React.SetStateAction<string | null>>
  canManageCollaborators: boolean
}) {
  const [search, setSearch] = useState("")
  const [division, setDivision] = useState<"All Divisions" | Division>(
    "All Divisions"
  )
  const [group, setGroup] = useState<"All Groups" | CollaboratorGroup>(
    "All Groups"
  )
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCollaborator, setEditingCollaborator] =
    useState<Collaborator | null>(null)

  const filteredCollaborators = collaborators.filter((collaborator) => {
    const normalizedSearch = search.toLowerCase()
    const matchesSearch =
      collaborator.name.toLowerCase().includes(normalizedSearch) ||
      collaborator.email.toLowerCase().includes(normalizedSearch)

    const matchesDivision =
      division === "All Divisions" || collaborator.division === division

    const matchesGroup =
      group === "All Groups" || collaborator.group === group

    return matchesSearch && matchesDivision && matchesGroup
  })

  async function handleDelete(id: number) {
    try {
      setCollaboratorsError(null)

      const response = await apiFetch(`${COLLABORATORS_API_URL}/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete collaborator")
      }

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

      const response = await apiFetch(
        editingCollaborator ? `${COLLABORATORS_API_URL}/${id}` : COLLABORATORS_API_URL,
        {
          method: editingCollaborator ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(collaboratorPayload),
        }
      )

      if (!response.ok) {
        throw new Error(
          editingCollaborator
            ? "Failed to update collaborator"
            : "Failed to create collaborator"
        )
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

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded px-4 py-2 w-full md:w-80"
          />

          <select
            value={division}
            onChange={(e) =>
              setDivision(e.target.value as "All Divisions" | Division)
            }
            className="border border-gray-300 rounded px-4 py-2 w-full md:w-auto"
          >
            <option>All Divisions</option>
            {divisions.map((divisionName) => (
              <option key={divisionName}>{divisionName}</option>
            ))}
          </select>

          <select
            value={group}
            onChange={(e) =>
              setGroup(e.target.value as "All Groups" | CollaboratorGroup)
            }
            className="border border-gray-300 rounded px-4 py-2 w-full md:w-auto"
          >
            <option>All Groups</option>
            {collaboratorGroups.map((groupName) => (
              <option key={groupName}>{groupName}</option>
            ))}
          </select>
        </div>

        <table className="w-full min-w-[1020px]">
          <thead>
            <tr className="border-b bg-gray-100">
              <th className="text-left py-3 px-2">Name</th>
              <th className="text-left py-3 px-2">Email</th>
              <th className="text-left py-3 px-2">Division</th>
              <th className="text-left py-3 px-2">Group</th>
              <th className="text-left py-3 px-2">Role</th>
              <th className="text-left py-3 px-2">Active Reservations</th>
              <th className="text-left py-3 px-2">Borrowed Items</th>
              {canManageCollaborators && (
                <th className="text-left py-3 px-2">Actions</th>
              )}
            </tr>
          </thead>

          <tbody>
            {filteredCollaborators.map((collaborator) => {
              const activeReservations = reservations.filter(
                (reservation) =>
                  reservation.collaborator === collaborator.name &&
                  reservation.status !== "Returned"
              ).length
              const borrowedItems = reservations.filter(
                (reservation) =>
                  reservation.collaborator === collaborator.name &&
                  reservation.status === "Borrowed"
              ).length

              return (
                <tr
                  key={collaborator.id}
                  className="border-b hover:bg-gray-50"
                >
                  <td className="py-3 px-2 font-medium">
                    {collaborator.name}
                  </td>
                  <td className="py-3 px-2">{collaborator.email}</td>
                  <td className="py-3 px-2">{collaborator.division}</td>
                  <td className="py-3 px-2">{collaborator.group}</td>
                  <td className="py-3 px-2">{collaborator.role}</td>
                  <td className="py-3 px-2">{activeReservations}</td>
                  <td className="py-3 px-2">{borrowedItems}</td>
                  {canManageCollaborators && (
                    <td className="py-3 px-2 space-x-2">
                      <button
                        onClick={() => {
                          setEditingCollaborator(collaborator)
                          setIsModalOpen(true)
                        }}
                        className="text-blue-600"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDelete(collaborator.id)}
                        className="text-red-600"
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}

            {filteredCollaborators.length === 0 && (
              <tr>
                <td
                  colSpan={canManageCollaborators ? 8 : 7}
                  className="py-8 text-center text-gray-500"
                >
                  No collaborators found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
    </>
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
}) {
  async function handlePartRequestAction(
    id: number,
    action: "approve" | "reject" | "return"
  ) {
    const managerComment =
      window.prompt("Manager comment", "")?.trim() || ""

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
    } catch {
      setRequestsError("Failed to update request")
    }
  }

  async function handleMissingItemAction(
    id: number,
    action: "approve" | "reject"
  ) {
    const managerComment =
      window.prompt("Manager comment", "")?.trim() || ""

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
    } catch {
      setRequestsError("Failed to update missing item request")
    }
  }

  return (
    <>
      <h2 className="text-3xl font-bold mb-8">Requests</h2>

      <div className="bg-white rounded-lg shadow p-6 mb-8 overflow-x-auto">
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

        <table className="w-full min-w-[1080px]">
          <thead>
            <tr className="border-b bg-gray-100">
              <th className="text-left py-3 px-2">Collaborator</th>
              <th className="text-left py-3 px-2">Part</th>
              <th className="text-left py-3 px-2">Type</th>
              <th className="text-left py-3 px-2">Qty</th>
              <th className="text-left py-3 px-2">Return Date</th>
              <th className="text-left py-3 px-2">Reason</th>
              <th className="text-left py-3 px-2">Status</th>
              <th className="text-left py-3 px-2">Comment</th>
              {canApproveRequests && (
                <th className="text-left py-3 px-2">Actions</th>
              )}
            </tr>
          </thead>

          <tbody>
            {partRequests.map((request) => (
              <tr key={request.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-2 font-medium">
                  {request.collaborator?.name || "Unknown"}
                </td>
                <td className="py-3 px-2">{request.part?.name || "Unknown"}</td>
                <td className="py-3 px-2">{request.requestType}</td>
                <td className="py-3 px-2">{request.quantity}</td>
                <td className="py-3 px-2">{request.expectedReturnDate}</td>
                <td className="py-3 px-2">{request.reason}</td>
                <td className="py-3 px-2">
                  <StatusPill status={request.status} />
                </td>
                <td className="py-3 px-2">
                  {request.managerComment || "-"}
                </td>
                {canApproveRequests && (
                  <td className="py-3 px-2">
                    <div className="flex flex-wrap gap-2">
                      {request.status === "Pending" && (
                        <>
                          <button
                            onClick={() =>
                              handlePartRequestAction(request.id, "approve")
                            }
                            className="text-green-600 font-semibold"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() =>
                              handlePartRequestAction(request.id, "reject")
                            }
                            className="text-red-600 font-semibold"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {(request.status === "Reserved" ||
                        request.status === "Borrowed") && (
                          <button
                            onClick={() =>
                              handlePartRequestAction(request.id, "return")
                            }
                            className="text-blue-600 font-semibold"
                          >
                            Mark Returned
                          </button>
                        )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-lg shadow p-6 overflow-x-auto">
        <h3 className="text-xl font-bold mb-4">Missing Item Requests</h3>

        <table className="w-full min-w-[1080px]">
          <thead>
            <tr className="border-b bg-gray-100">
              <th className="text-left py-3 px-2">Collaborator</th>
              <th className="text-left py-3 px-2">Item</th>
              <th className="text-left py-3 px-2">Category</th>
              <th className="text-left py-3 px-2">Manufacturer</th>
              <th className="text-left py-3 px-2">Reference</th>
              <th className="text-left py-3 px-2">Qty</th>
              <th className="text-left py-3 px-2">Needed Date</th>
              <th className="text-left py-3 px-2">Status</th>
              <th className="text-left py-3 px-2">Comment</th>
              {canApproveRequests && (
                <th className="text-left py-3 px-2">Actions</th>
              )}
            </tr>
          </thead>

          <tbody>
            {missingItemRequests.map((request) => (
              <tr key={request.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-2 font-medium">
                  {request.collaborator?.name || "Unknown"}
                </td>
                <td className="py-3 px-2">{request.itemName}</td>
                <td className="py-3 px-2">{request.category}</td>
                <td className="py-3 px-2">{request.manufacturer || "-"}</td>
                <td className="py-3 px-2">{request.reference || "-"}</td>
                <td className="py-3 px-2">{request.quantityNeeded}</td>
                <td className="py-3 px-2">{request.neededDate}</td>
                <td className="py-3 px-2">
                  <StatusPill status={request.status} />
                </td>
                <td className="py-3 px-2">
                  {request.managerComment || "-"}
                </td>
                {canApproveRequests && (
                  <td className="py-3 px-2 space-x-2">
                    {request.status === "Pending" && (
                      <>
                        <button
                          onClick={() =>
                            handleMissingItemAction(request.id, "approve")
                          }
                          className="text-green-600 font-semibold"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() =>
                            handleMissingItemAction(request.id, "reject")
                          }
                          className="text-red-600 font-semibold"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
}: {
  partRequests: PartRequest[]
  missingItemRequests: MissingItemRequest[]
  isLoadingRequests: boolean
  requestsError: string | null
  apiFetch: ApiFetch
  reloadRequests: () => Promise<void>
  setRequestsError: React.Dispatch<React.SetStateAction<string | null>>
}) {
  const [isMissingItemModalOpen, setIsMissingItemModalOpen] = useState(false)

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
      setIsMissingItemModalOpen(false)
    } catch {
      setRequestsError("Failed to submit missing item request")
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

      <div className="bg-white rounded-lg shadow p-6 mb-8 overflow-x-auto">
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
              <th className="text-left py-3 px-2">Qty</th>
              <th className="text-left py-3 px-2">Return Date</th>
              <th className="text-left py-3 px-2">Status</th>
              <th className="text-left py-3 px-2">Manager Comment</th>
            </tr>
          </thead>
          <tbody>
            {partRequests.map((request) => (
              <tr key={request.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-2 font-medium">
                  {request.part?.name || "Unknown"}
                </td>
                <td className="py-3 px-2">{request.requestType}</td>
                <td className="py-3 px-2">{request.quantity}</td>
                <td className="py-3 px-2">{request.expectedReturnDate}</td>
                <td className="py-3 px-2">
                  <StatusPill status={request.status} />
                </td>
                <td className="py-3 px-2">
                  {request.managerComment || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-lg shadow p-6 overflow-x-auto">
        <h3 className="text-xl font-bold mb-4">Missing Item Requests</h3>
        <table className="w-full min-w-[860px]">
          <thead>
            <tr className="border-b bg-gray-100">
              <th className="text-left py-3 px-2">Item</th>
              <th className="text-left py-3 px-2">Category</th>
              <th className="text-left py-3 px-2">Qty</th>
              <th className="text-left py-3 px-2">Needed Date</th>
              <th className="text-left py-3 px-2">Status</th>
              <th className="text-left py-3 px-2">Manager Comment</th>
            </tr>
          </thead>
          <tbody>
            {missingItemRequests.map((request) => (
              <tr key={request.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-2 font-medium">{request.itemName}</td>
                <td className="py-3 px-2">{request.category}</td>
                <td className="py-3 px-2">{request.quantityNeeded}</td>
                <td className="py-3 px-2">{request.neededDate}</td>
                <td className="py-3 px-2">
                  <StatusPill status={request.status} />
                </td>
                <td className="py-3 px-2">
                  {request.managerComment || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isMissingItemModalOpen && (
        <MissingItemRequestModal
          onClose={() => setIsMissingItemModalOpen(false)}
          onSave={handleMissingItemRequest}
        />
      )}
    </>
  )
}

function SettingsPage({
  users,
  collaborators,
  usersError,
  apiFetch,
  reloadUsers,
  setUsersError,
}: {
  users: AuthUser[]
  collaborators: Collaborator[]
  usersError: string | null
  apiFetch: ApiFetch
  reloadUsers: () => Promise<void>
  setUsersError: React.Dispatch<React.SetStateAction<string | null>>
}) {
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id || 0)
  const selectedUser = users.find((user) => user.id === selectedUserId) || users[0]
  const [role, setRole] = useState<UserRole>(selectedUser?.role || "Viewer")
  const [managedDivision, setManagedDivision] = useState<Division>(
    (selectedUser?.managedDivision as Division) || "Division 1"
  )

  useEffect(() => {
    if (!selectedUser) {
      return
    }

    setRole(selectedUser.role)
    setManagedDivision((selectedUser.managedDivision as Division) || "Division 1")
  }, [selectedUserId, users.length])

  async function handleSaveAssignment() {
    if (!selectedUser) {
      return
    }

    try {
      setUsersError(null)

      const response = await apiFetch(
        `${USERS_API_URL}/${selectedUser.id}/assignment`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            role,
            managedDivision:
              role === "Inventory Manager" ? managedDivision : null,
          }),
        }
      )

      if (!response.ok) {
        throw new Error("Failed to update user assignment")
      }

      await reloadUsers()
    } catch {
      setUsersError("Failed to update user assignment")
    }
  }

  return (
    <>
      <h2 className="text-3xl font-bold mb-8">Settings</h2>

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h3 className="text-xl font-bold mb-4">Manager Assignment</h3>

        {usersError && (
          <div className="mb-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {usersError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={selectedUser?.id || 0}
            onChange={(event) => setSelectedUserId(Number(event.target.value))}
            className="border border-gray-300 rounded px-4 py-2"
          >
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} - {user.email}
              </option>
            ))}
          </select>

          <select
            value={role}
            onChange={(event) => setRole(event.target.value as UserRole)}
            className="border border-gray-300 rounded px-4 py-2"
          >
            <option>Admin</option>
            <option>Inventory Manager</option>
            <option>Collaborator</option>
            <option>Viewer</option>
          </select>

          <select
            value={managedDivision}
            onChange={(event) =>
              setManagedDivision(event.target.value as Division)
            }
            className="border border-gray-300 rounded px-4 py-2"
            disabled={role !== "Inventory Manager"}
          >
            {divisions
              .filter((division) => division !== "Admin")
              .map((division) => (
                <option key={division}>{division}</option>
              ))}
          </select>

          <button
            onClick={handleSaveAssignment}
            disabled={!selectedUser}
            className="bg-yellow-400 text-black font-semibold px-4 py-2 rounded disabled:opacity-60"
          >
            Save Assignment
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 overflow-x-auto">
        <h3 className="text-xl font-bold mb-4">Users and Collaborators</h3>

        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b bg-gray-100">
              <th className="text-left py-3 px-2">Name</th>
              <th className="text-left py-3 px-2">Email</th>
              <th className="text-left py-3 px-2">Role</th>
              <th className="text-left py-3 px-2">Division</th>
              <th className="text-left py-3 px-2">Managed Division</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-2 font-medium">{user.name}</td>
                <td className="py-3 px-2">{user.email}</td>
                <td className="py-3 px-2">{user.role}</td>
                <td className="py-3 px-2">{user.division}</td>
                <td className="py-3 px-2">{user.managedDivision || "-"}</td>
              </tr>
            ))}
            {collaborators
              .filter(
                (collaborator) =>
                  !users.some((user) => user.email === collaborator.email)
              )
              .map((collaborator) => (
                <tr key={`collaborator-${collaborator.id}`} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-2 font-medium">{collaborator.name}</td>
                  <td className="py-3 px-2">{collaborator.email}</td>
                  <td className="py-3 px-2">{collaborator.role}</td>
                  <td className="py-3 px-2">{collaborator.division}</td>
                  <td className="py-3 px-2">-</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function Reservations({
  parts,
  collaborators,
  reservations,
  isLoadingReservations,
  reservationsError,
  apiFetch,
  reloadParts,
  reloadReservations,
  reloadAnalytics,
  setReservationsError,
  canCreateReservations,
  canManageReservations,
}: {
  parts: Part[]
  collaborators: Collaborator[]
  reservations: Reservation[]
  isLoadingReservations: boolean
  reservationsError: string | null
  apiFetch: ApiFetch
  reloadParts: () => Promise<void>
  reloadReservations: () => Promise<void>
  reloadAnalytics: () => Promise<void>
  setReservationsError: React.Dispatch<React.SetStateAction<string | null>>
  canCreateReservations: boolean
  canManageReservations: boolean
}) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  async function handleCreate(reservation: Reservation) {
    const { id, collaborator, partName, ...reservationPayload } = reservation

    try {
      setReservationsError(null)

      const response = await apiFetch(RESERVATIONS_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reservationPayload),
      })

      if (!response.ok) {
        throw new Error("Failed to create reservation")
      }

      await reloadReservations()
      await reloadParts()
      await reloadAnalytics()
      setIsModalOpen(false)
    } catch {
      setReservationsError("Failed to create reservation")
    }
  }

  async function handleDelete(id: number) {
    try {
      setReservationsError(null)

      const response = await apiFetch(`${RESERVATIONS_API_URL}/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete reservation")
      }

      await reloadReservations()
      await reloadParts()
      await reloadAnalytics()
    } catch {
      setReservationsError("Failed to delete reservation")
    }
  }

  async function markBorrowed(id: number) {
    try {
      setReservationsError(null)

      const response = await apiFetch(`${RESERVATIONS_API_URL}/${id}/mark-borrowed`, {
        method: "PUT",
      })

      if (!response.ok) {
        throw new Error("Failed to mark reservation as borrowed")
      }

      await reloadReservations()
      await reloadAnalytics()
    } catch {
      setReservationsError("Failed to mark reservation as borrowed")
    }
  }

  async function returnReservation(id: number) {
    try {
      setReservationsError(null)

      const response = await apiFetch(`${RESERVATIONS_API_URL}/${id}/return`, {
        method: "PUT",
      })

      if (!response.ok) {
        throw new Error("Failed to return reservation")
      }

      await reloadReservations()
      await reloadParts()
      await reloadAnalytics()
    } catch {
      setReservationsError("Failed to return reservation")
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

        <table className="w-full min-w-[820px]">
          <thead>
            <tr className="border-b bg-gray-100">
              <th className="text-left py-3 px-2">Collaborator</th>
              <th className="text-left py-3 px-2">Part</th>
              <th className="text-left py-3 px-2">Qty</th>
              <th className="text-left py-3 px-2">Expected Return</th>
              <th className="text-left py-3 px-2">Status</th>
              {canManageReservations && (
                <th className="text-left py-3 px-2">Actions</th>
              )}
            </tr>
          </thead>

          <tbody>
            {reservations.map((reservation) => (
              <tr key={reservation.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-2 font-medium">
                  {reservation.collaborator}
                </td>
                <td className="py-3 px-2">{reservation.partName}</td>
                <td className="py-3 px-2">{reservation.quantity}</td>
                <td className="py-3 px-2">
                  {reservation.expectedReturnDate}
                </td>
                <td className="py-3 px-2">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${reservation.status === "Reserved"
                      ? "bg-yellow-100 text-yellow-800"
                      : reservation.status === "Borrowed"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-green-100 text-green-800"
                      }`}
                  >
                    {reservation.status}
                  </span>
                </td>
                {canManageReservations && (
                  <td className="py-3 px-2">
                    <div className="flex flex-wrap gap-2">
                      {canManageReservations &&
                        reservation.status === "Reserved" && (
                          <button
                            onClick={() => markBorrowed(reservation.id)}
                            className="text-blue-600"
                          >
                            Mark Borrowed
                          </button>
                        )}

                      {canManageReservations &&
                        reservation.status === "Borrowed" && (
                          <button
                            onClick={() => returnReservation(reservation.id)}
                            className="text-green-600"
                          >
                            Return
                          </button>
                        )}

                      {canManageReservations && (
                        <button
                          onClick={() => handleDelete(reservation.id)}
                          className="text-red-600"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}

            {reservations.length === 0 && (
              <tr>
                <td
                  colSpan={canManageReservations ? 6 : 5}
                  className="py-8 text-center text-gray-500"
                >
                  No reservations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <ReservationModal
          parts={parts}
          collaborators={collaborators}
          onClose={() => setIsModalOpen(false)}
          onSave={handleCreate}
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
                {part.name} ({part.quantity} available)
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

          <input
            type="date"
            value={form.expectedReturnDate}
            onChange={(e) =>
              updateField("expectedReturnDate", e.target.value)
            }
            className="w-full border rounded px-4 py-2"
          />

          <select
            value={form.status}
            onChange={(e) =>
              updateField("status", e.target.value as Reservation["status"])
            }
            className="w-full border rounded px-4 py-2"
          >
            <option>Reserved</option>
            <option>Borrowed</option>
            <option>Returned</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 border rounded">
            Cancel
          </button>

          <button
            onClick={() => onSave(form)}
            className="px-4 py-2 bg-yellow-400 text-black font-semibold rounded"
            disabled={!form.collaboratorId || !form.partId}
          >
            Save
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
  onSave: (request: {
    partId: number
    quantity: number
    requestType: "Reservation" | "Borrow"
    expectedReturnDate: string
    reason: string
  }) => void
}) {
  const [form, setForm] = useState({
    partId: part.id,
    quantity: 1,
    requestType: "Reservation" as "Reservation" | "Borrow",
    expectedReturnDate: "",
    reason: "",
  })

  function updateField(field: keyof typeof form, value: string | number) {
    setForm({ ...form, [field]: value })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-[500px]">
        <h3 className="text-2xl font-bold mb-2">Request Part</h3>
        <p className="text-gray-600 mb-6">
          {part.name} - {part.quantity} available
        </p>

        <div className="space-y-4">
          <input
            value={part.name}
            className="w-full border rounded px-4 py-2 bg-gray-100"
            disabled
          />

          <input
            type="number"
            min={1}
            max={part.quantity}
            value={form.quantity}
            onChange={(e) => updateField("quantity", Number(e.target.value))}
            className="w-full border rounded px-4 py-2"
          />

          <select
            value={form.requestType}
            onChange={(e) =>
              updateField(
                "requestType",
                e.target.value as "Reservation" | "Borrow"
              )
            }
            className="w-full border rounded px-4 py-2"
          >
            <option>Reservation</option>
            <option>Borrow</option>
          </select>

          <input
            type="date"
            value={form.expectedReturnDate}
            onChange={(e) => updateField("expectedReturnDate", e.target.value)}
            className="w-full border rounded px-4 py-2"
          />

          <textarea
            placeholder="Reason / description"
            value={form.reason}
            onChange={(e) => updateField("reason", e.target.value)}
            className="w-full border rounded px-4 py-2 min-h-28"
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 border rounded">
            Cancel
          </button>

          <button
            onClick={() => onSave(form)}
            className="px-4 py-2 bg-yellow-400 text-black font-semibold rounded"
            disabled={
              form.quantity <= 0 ||
              form.quantity > part.quantity ||
              !form.expectedReturnDate ||
              !form.reason
            }
          >
            Submit Request
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
  onSave: (request: {
    itemName: string
    category: string
    manufacturer: string
    reference: string
    quantityNeeded: number
    reason: string
    neededDate: string
  }) => void
}) {
  const [form, setForm] = useState({
    itemName: "",
    category: partCategories[0],
    manufacturer: "",
    reference: "",
    quantityNeeded: 1,
    reason: "",
    neededDate: "",
  })

  function updateField(field: keyof typeof form, value: string | number) {
    setForm({ ...form, [field]: value })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-[540px]">
        <h3 className="text-2xl font-bold mb-6">Request Missing Item</h3>

        <div className="space-y-4">
          <input
            placeholder="Item name"
            value={form.itemName}
            onChange={(e) => updateField("itemName", e.target.value)}
            className="w-full border rounded px-4 py-2"
          />

          <select
            value={form.category}
            onChange={(e) => updateField("category", e.target.value)}
            className="w-full border rounded px-4 py-2"
          >
            {partCategories.map((categoryName) => (
              <option key={categoryName}>{categoryName}</option>
            ))}
          </select>

          <input
            placeholder="Manufacturer (optional)"
            value={form.manufacturer}
            onChange={(e) => updateField("manufacturer", e.target.value)}
            className="w-full border rounded px-4 py-2"
          />

          <input
            placeholder="Reference (optional)"
            value={form.reference}
            onChange={(e) => updateField("reference", e.target.value)}
            className="w-full border rounded px-4 py-2"
          />

          <input
            type="number"
            min={1}
            value={form.quantityNeeded}
            onChange={(e) =>
              updateField("quantityNeeded", Number(e.target.value))
            }
            className="w-full border rounded px-4 py-2"
          />

          <input
            type="date"
            value={form.neededDate}
            onChange={(e) => updateField("neededDate", e.target.value)}
            className="w-full border rounded px-4 py-2"
          />

          <textarea
            placeholder="Reason / description"
            value={form.reason}
            onChange={(e) => updateField("reason", e.target.value)}
            className="w-full border rounded px-4 py-2 min-h-28"
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 border rounded">
            Cancel
          </button>

          <button
            onClick={() => onSave(form)}
            className="px-4 py-2 bg-yellow-400 text-black font-semibold rounded"
            disabled={
              !form.itemName ||
              !form.category ||
              form.quantityNeeded <= 0 ||
              !form.neededDate ||
              !form.reason
            }
          >
            Submit Request
          </button>
        </div>
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: RequestStatus }) {
  const classes =
    status === "Pending"
      ? "bg-yellow-100 text-yellow-800"
      : status === "Rejected" || status === "Cancelled"
        ? "bg-red-100 text-red-800"
        : status === "Returned" || status === "Approved"
          ? "bg-green-100 text-green-800"
          : "bg-blue-100 text-blue-800"

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${classes}`}>
      {status}
    </span>
  )
}

function PartModal({
  part,
  onClose,
  onSave,
}: {
  part: Part | null
  onClose: () => void
  onSave: (part: Part) => void
}) {
  const [form, setForm] = useState<Part>(
    part || {
      id: Date.now(),
      name: "",
      category: partCategories[0],
      reference: "",
      quantity: 0,
      location: "",
      status: "Available",
    }
  )

  function updateField(field: keyof Part, value: string | number) {
    setForm({ ...form, [field]: value })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-6 w-[500px]">
        <h3 className="text-2xl font-bold mb-6">
          {part ? "Edit Part" : "Add New Part"}
        </h3>

        <div className="space-y-4">
          <input
            placeholder="Part name"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            className="w-full border rounded px-4 py-2"
          />

          <select
            value={form.category}
            onChange={(e) => updateField("category", e.target.value)}
            className="w-full border rounded px-4 py-2"
          >
            {partCategories.map((categoryName) => (
              <option key={categoryName}>{categoryName}</option>
            ))}
          </select>

          <input
            placeholder="Reference"
            value={form.reference}
            onChange={(e) => updateField("reference", e.target.value)}
            className="w-full border rounded px-4 py-2"
          />

          <input
            type="number"
            placeholder="Quantity"
            value={form.quantity}
            onChange={(e) => updateField("quantity", Number(e.target.value))}
            className="w-full border rounded px-4 py-2"
          />

          <input
            placeholder="Location"
            value={form.location}
            onChange={(e) => updateField("location", e.target.value)}
            className="w-full border rounded px-4 py-2"
          />

          <select
            value={form.status}
            onChange={(e) => updateField("status", e.target.value)}
            className="w-full border rounded px-4 py-2"
          >
            <option>Available</option>
            <option>Borrowed</option>
            <option>Low Stock</option>
            <option>Reserved</option>
            <option>Damaged</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 border rounded">
            Cancel
          </button>

          <button
            onClick={() => onSave(form)}
            className="px-4 py-2 bg-yellow-400 text-black font-semibold rounded"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  color = "text-black",
}: {
  label: string
  value: string
  color?: string
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-gray-500">{label}</p>
      <h3 className={`text-3xl font-bold ${color}`}>{value}</h3>
    </div>
  )
}

function ChartCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-4">{title}</h3>
      {children}
    </div>
  )
}

function AnalyticsTable({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6 overflow-x-auto">
      <h3 className="text-xl font-bold mb-4">{title}</h3>
      {children}
    </div>
  )
}

export default App
