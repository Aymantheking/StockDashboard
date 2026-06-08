import { useEffect, useRef, useState } from "react"
import {
  BarChart3,
  Boxes,
  CalendarCheck,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Download,
  Eye,
  FileText,
  FilePlus2,
  Inbox,
  LayoutDashboard,
  Package,
  Pencil,
  RotateCcw,
  Settings,
  ShoppingCart,
  Trash2,
  Truck,
  UserRoundSearch,
  Users,
  XCircle,
} from "lucide-react"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
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
  manufacturer: string
  reference: string
  quantity: number
  totalQuantity: number
  availableQuantity: number
  reservedQuantity: number
  borrowedQuantity: number
  damagedQuantity: number
  location: string
  description: string
  stockAllocationNote: string
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
  rating: number
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
  emailVerificationStatus?: "Pending" | "Verified" | "Rejected"
}

type AuthResponse = {
  accessToken: string
  user: AuthUser
  message?: string
}

type AppSettings = {
  lowStockThreshold: number
  appName: string
}

type PurchasePriority = "Low" | "Medium" | "High" | "Critical"
type PurchaseStatus =
  | "Pending"
  | "Approved"
  | "Ordered"
  | "In Transit"
  | "Received"
  | "Cancelled"

type Purchase = {
  id: number
  itemName: string
  category: string
  manufacturer: string
  reference: string
  quantity: number
  reason: string
  priority: PurchasePriority
  status: PurchaseStatus
  requestedById: number
  division: Division
  supplierName: string
  supplierContact: string
  unitPrice: number
  totalPrice: number
  expectedArrivalDate: string | null
  receivedDate: string | null
  adminComment: string
}

type RatingHistoryItem = {
  id: number
  collaboratorId: number
  previousRating: number
  newRating: number
  reason: string
  changedBy: string
  createdAt: string
}

type Supplier = {
  id: number
  name: string
  contactPerson: string
  email: string
  phone: string
  website: string
  country: string
  notes: string
  status: "Active" | "Inactive"
}

type NotificationItemSummary = {
  id: string
  type:
  | "UserVerification"
  | "PartRequest"
  | "MissingItemRequest"
  | "PurchaseRequest"
  | "ReturnConfirmation"
  | "RequestUpdate"
  title: string
  description: string
  targetPage: string
  targetSection?: string
  targetId?: number
  createdAt?: string
}

type NotificationSummary = {
  totalUnread: number
  counts: {
    pendingUserVerifications: number
    pendingPartRequests: number
    pendingMissingItemRequests: number
    pendingPurchaseRequests: number
    pendingReturnConfirmations: number
  }
  pendingUserVerifications: number
  pendingPartRequests: number
  pendingMissingItemRequests: number
  pendingPurchaseRequests: number
  pendingReturnConfirmations: number
  items: NotificationItemSummary[]
}

type ApiFetch = (url: string, options?: RequestInit) => Promise<Response>

type RequestStatus =
  | "Pending"
  | "Approved"
  | "Rejected"
  | "Borrowed"
  | "Reserved"
  | "Return Pending"
  | "Returned"
  | "Damaged"
  | "Cancelled"

type PartRequest = {
  id: number
  collaboratorId: number
  partId: number
  quantity: number
  requestType: "Reservation" | "Borrow"
  reason: string
  expectedReturnDate: string
  usageDate: string | null
  startDate: string | null
  dueDate: string | null
  status: RequestStatus
  managerComment: string
  returnDeclaredAt?: string | null
  returnGoodQuantity?: number | null
  returnDamagedQuantity?: number | null
  returnComment?: string | null
  returnConfirmedAt?: string | null
  confirmedGoodQuantity?: number | null
  confirmedDamagedQuantity?: number | null
  returnManagerComment?: string | null
  createdAt?: string
  updatedAt?: string
  collaborator?: Collaborator
  part?: Part
}

type MissingItemRequest = {
  id: number
  collaboratorId: number
  partId?: number | null
  itemName: string
  category: string
  manufacturer: string
  reference: string
  quantityNeeded: number
  reason: string
  neededDate: string
  status: RequestStatus
  managerComment: string
  createdAt?: string
  updatedAt?: string
  collaborator?: Collaborator
}

type AnalyticsSummary = {
  totalParts: number
  availableParts: number
  borrowedParts: number
  reservedParts: number
  damagedParts?: number
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
    returnedParts?: number
    damagedParts?: number
  }[]
  borrowedPartsByGroup: {
    group: CollaboratorGroup
    collaborators: number
    reservationCount: number
    activeReservations: number
    borrowedCount: number
    borrowedParts: number
    returnedParts?: number
    damagedParts?: number
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

const PARTS_API_URL = "http://localhost:3001/parts"
const COLLABORATORS_API_URL = "http://localhost:3001/collaborators"
const RESERVATIONS_API_URL = "http://localhost:3001/reservations"
const ANALYTICS_API_URL = "http://localhost:3001/analytics/summary"
const AUTH_API_URL = "http://localhost:3001/auth"
const USERS_API_URL = "http://localhost:3001/users"
const REQUESTS_API_URL = "http://localhost:3001/requests"
const MISSING_ITEM_REQUESTS_API_URL =
  "http://localhost:3001/missing-item-requests"
const SETTINGS_API_URL = "http://localhost:3001/settings"
const PURCHASES_API_URL = "http://localhost:3001/purchases"
const SUPPLIERS_API_URL = "http://localhost:3001/suppliers"
const NOTIFICATIONS_API_URL = "http://localhost:3001/notifications/summary"
const NOTIFICATIONS_MARK_SEEN_API_URL =
  "http://localhost:3001/notifications/mark-all-seen"
const PAGE_SIZE = 10

function getTodayDate() {
  return new Date().toISOString().slice(0, 10)
}

function isPastDate(value?: string | null) {
  return Boolean(value && value < getTodayDate())
}

function withoutSupplierName(contact: string, supplierName: string) {
  const normalizedContact = contact.trim()
  const normalizedName = supplierName.trim()

  if (
    normalizedName &&
    normalizedContact.toLowerCase().startsWith(normalizedName.toLowerCase())
  ) {
    return normalizedContact
      .slice(normalizedName.length)
      .replace(/^\s*\/\s*/, "")
      .trim()
  }

  return normalizedContact
}

function getPageItems<T>(items: T[], page: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const safePage = Math.min(Math.max(page, 1), totalPages)
  const start = (safePage - 1) * PAGE_SIZE

  return {
    items: items.slice(start, start + PAGE_SIZE),
    page: safePage,
    totalPages,
    total: items.length,
    start: items.length === 0 ? 0 : start + 1,
    end: Math.min(start + PAGE_SIZE, items.length),
  }
}

async function loadLogoDataUrl() {
  const response = await fetch("/black.png")
  const blob = await response.blob()

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

async function captureChartDataUrl(elementId: string) {
  const container = document.getElementById(elementId)
  const svg = container?.querySelector("svg")

  if (!svg) {
    throw new Error(`Chart ${elementId} is not available`)
  }

  const bounds = svg.getBoundingClientRect()
  const width = Math.max(640, Math.ceil(bounds.width || 640))
  const height = Math.max(300, Math.ceil(bounds.height || 300))
  const exportSvg = svg.cloneNode(true) as SVGSVGElement
  exportSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg")
  exportSvg.setAttribute("width", String(width))
  exportSvg.setAttribute("height", String(height))
  exportSvg.setAttribute("viewBox", `0 0 ${width} ${height}`)
  const serializedSvg = new XMLSerializer().serializeToString(exportSvg)
  const blob = new Blob([serializedSvg], {
    type: "image/svg+xml;charset=utf-8",
  })
  const objectUrl = URL.createObjectURL(blob)

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image()
      nextImage.onload = () => resolve(nextImage)
      nextImage.onerror = () => reject(new Error(`Failed to render ${elementId}`))
      nextImage.src = objectUrl
    })
    const canvas = document.createElement("canvas")
    canvas.width = width * 2
    canvas.height = height * 2
    const context = canvas.getContext("2d")

    if (!context) {
      throw new Error("Canvas is unavailable")
    }

    context.scale(2, 2)
    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, width, height)
    context.drawImage(image, 0, 0, width, height)
    return canvas.toDataURL("image/png")
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function addPdfFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    doc.setFontSize(8)
    doc.setTextColor(100)
    doc.text("Generated by StockDashboard", 14, 287)
    doc.text(`Page ${page} of ${pageCount}`, 196, 287, { align: "right" })
  }
}

function emptyNotificationSummary(): NotificationSummary {
  return {
    totalUnread: 0,
    counts: {
      pendingUserVerifications: 0,
      pendingPartRequests: 0,
      pendingMissingItemRequests: 0,
      pendingPurchaseRequests: 0,
      pendingReturnConfirmations: 0,
    },
    pendingUserVerifications: 0,
    pendingPartRequests: 0,
    pendingMissingItemRequests: 0,
    pendingPurchaseRequests: 0,
    pendingReturnConfirmations: 0,
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
  }

  return {
    ...summary,
    counts,
    pendingUserVerifications: counts.pendingUserVerifications,
    pendingPartRequests: counts.pendingPartRequests,
    pendingMissingItemRequests: counts.pendingMissingItemRequests,
    pendingPurchaseRequests: counts.pendingPurchaseRequests,
    pendingReturnConfirmations: counts.pendingReturnConfirmations,
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

const categoryColorMap: Record<string, string> = {
  Microprocessors: "#facc15",
  Microcontrollers: "#2563eb",
  PCBs: "#16a34a",
  Sensors: "#dc2626",
  Actuators: "#9333ea",
  "Development Boards": "#0891b2",
  "Communication Modules": "#ea580c",
  Connectors: "#4f46e5",
  Cables: "#65a30d",
  "Power Modules": "#be123c",
  "Test Equipment": "#0f766e",
  Tools: "#7c2d12",
  Other: "#64748b",
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
      const response = await apiFetch(NOTIFICATIONS_MARK_SEEN_API_URL, {
        method: "POST",
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
  const canUsePurchases = hasRole(currentUser, ["Admin", "Inventory Manager"])
  const activeVisiblePage = pages.includes(activePage) ? activePage : pages[0]
  const notificationCount = notificationSummary.totalUnread

  function handleNotificationNavigate(item: NotificationItemSummary) {
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
              summary={notificationSummary}
              onNavigate={handleNotificationNavigate}
              onMarkAllSeen={markAllNotificationsSeen}
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
          <SidebarNavigation
            pages={pages}
            activePage={activeVisiblePage}
            onNavigate={setActivePage}
            badgeCounts={getSidebarBadgeCounts(notificationSummary)}
          />
        </aside>
        <main className="flex-1 p-8">
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
            <Inventory
              parts={parts}
              isLoadingParts={isLoadingParts}
              partsError={partsError}
              apiFetch={apiFetch}
              reloadParts={loadParts}
              reloadAnalytics={loadAnalytics}
              reloadPurchases={loadPurchases}
              setPartsError={setPartsError}
              canManageParts={canManageParts}
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
        </main>
      </div>
    </div>
  )
}

function hasRole(user: AuthUser, roles: UserRole[]) {
  return roles.includes(user.role)
}

function SidebarNavigation({
  pages,
  activePage,
  onNavigate,
  badgeCounts,
}: {
  pages: string[]
  activePage: string
  onNavigate: (page: string) => void
  badgeCounts: Record<string, number>
}) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    Inventory: true,
    Contacts: true,
  })
  const pageIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    Dashboard: LayoutDashboard,
    Inventory: Boxes,
    Reservations: CalendarCheck,
    Requests: Inbox,
    "My Requests": Inbox,
    Collaborators: Users,
    Suppliers: Truck,
    Purchase: ShoppingCart,
    Analytics: BarChart3,
    Settings,
  }
  const sections = [
    {
      title: "",
      icon: LayoutDashboard,
      pages: ["Dashboard"],
      collapsible: false,
    },
    {
      title: "Inventory",
      icon: Package,
      pages: ["Inventory", "Reservations", "Requests", "My Requests"],
      collapsible: true,
    },
    {
      title: "Contacts",
      icon: Users,
      pages: ["Collaborators", "Suppliers"],
      collapsible: true,
    },
    {
      title: "",
      icon: ShoppingCart,
      pages: ["Purchase"],
      collapsible: false,
    },
    { title: "", icon: BarChart3, pages: ["Analytics"], collapsible: false },
    { title: "", icon: Settings, pages: ["Settings"], collapsible: false },
  ]

  return (
    <nav className="space-y-3">
      {sections.map((section, index) => {
        const visiblePages = section.pages.filter((page) => pages.includes(page))
        const hasActiveChild = visiblePages.includes(activePage)
        const isOpen =
          !section.collapsible ||
          openSections[section.title] ||
          hasActiveChild

        if (visiblePages.length === 0) {
          return null
        }

        if (!section.title) {
          return visiblePages.map((page) => (
            (() => {
              const PageIcon = pageIcons[page] || section.icon

              return (
                <button
                  key={page}
                  onClick={() => onNavigate(page)}
                  className={`flex w-full items-center gap-3 rounded px-3 py-3 text-left transition ${activePage === page
                    ? "bg-yellow-400 font-semibold text-black"
                    : "hover:bg-gray-800 hover:text-yellow-400"
                    }`}
                >
                  <PageIcon className="h-5 w-5 shrink-0" />
                  <span>{page}</span>
                  <SidebarBadge count={badgeCounts[page] || 0} />
                </button>
              )
            })()
          ))
        }

        const SectionIcon = section.icon

        return (
          <div key={`${section.title}-${index}`}>
            <button
              onClick={() =>
                setOpenSections({
                  ...openSections,
                  [section.title]: !openSections[section.title],
                })
              }
              className={`flex w-full items-center justify-between rounded px-3 py-3 text-left transition ${hasActiveChild
                ? "text-yellow-400"
                : "hover:bg-gray-800 hover:text-yellow-400"
                }`}
            >
              <span className="flex items-center gap-3 font-semibold">
                <SectionIcon className="h-5 w-5 shrink-0" />
                <span>{section.title}</span>
                <SidebarBadge count={badgeCounts[section.title] || 0} />
              </span>
              {isOpen ? (
                <ChevronDown className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0" />
              )}
            </button>
            {isOpen && (
              <div className="mt-1 space-y-1 pl-6">
                {visiblePages.map((page) => (
                  (() => {
                    const PageIcon = pageIcons[page] || SectionIcon

                    return (
                      <button
                        key={page}
                        onClick={() => onNavigate(page)}
                        className={`flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm transition ${activePage === page
                          ? "bg-yellow-400 font-semibold text-black"
                          : "text-gray-300 hover:bg-gray-800 hover:text-yellow-400"
                          }`}
                      >
                        <PageIcon className="h-5 w-5 shrink-0" />
                        <span>{page}</span>
                        <SidebarBadge count={badgeCounts[page] || 0} />
                      </button>
                    )
                  })()
                ))}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}

function SidebarBadge({ count }: { count: number }) {
  if (count <= 0) {
    return null
  }

  return (
    <span className="ml-auto min-w-5 rounded-full bg-yellow-400 px-1.5 py-0.5 text-center text-xs font-bold text-black">
      {count}
    </span>
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

function isHighlightTarget(
  highlightTarget: {
    targetPage: string
    targetSection?: string
    targetId?: number
  } | null,
  targetPage: string,
  targetSection?: string,
  targetId?: number
) {
  if (!highlightTarget || highlightTarget.targetPage !== targetPage) {
    return false
  }

  if (targetSection && highlightTarget.targetSection !== targetSection) {
    return false
  }

  if (targetId !== undefined && highlightTarget.targetId !== targetId) {
    return false
  }

  return true
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
      "Suppliers",
      "Analytics",
      "Requests",
      "Purchase",
      "Settings",
    ]
  }

  if (user.role === "Inventory Manager") {
    return [
      "Dashboard",
      "Inventory",
      "Reservations",
      "Collaborators",
      "Suppliers",
      "Analytics",
      "Requests",
      "Purchase",
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
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [email, setEmail] = useState("admin@stockdashboard.local")
  const [password, setPassword] = useState("admin123")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [name, setName] = useState("")
  const [division, setDivision] = useState<Division>("Division 1")
  const [group, setGroup] = useState<CollaboratorGroup>("Group 1")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [forgotMessage, setForgotMessage] = useState("")
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      setIsSubmitting(true)
      setAuthError("")
      setForgotMessage("")

      if (mode === "signup") {
        if (!email.toLowerCase().endsWith("@bertrandt.com")) {
          throw new Error("signup-email")
        }

        if (password !== confirmPassword) {
          throw new Error("signup-password")
        }
      }

      const response = await fetch(
        `${AUTH_API_URL}/${mode === "login" ? "login" : "register"}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            mode === "login"
              ? { email, password }
              : { name, email, password, division, group }
          ),
        }
      )

      if (!response.ok) {
        throw new Error(mode === "login" ? "Login failed" : "Signup failed")
      }

      const authResponse = (await response.json()) as AuthResponse
      if (!authResponse.accessToken) {
        setAuthError(
          authResponse.message ||
          "Your account was created. Please wait for administrator verification."
        )
        setMode("login")
        return
      }

      onLogin(authResponse)
    } catch (error) {
      if ((error as Error).message === "signup-email") {
        setAuthError("Email must end with @bertrandt.com")
      } else if ((error as Error).message === "signup-password") {
        setAuthError("Passwords do not match")
      } else {
        setAuthError(
          mode === "login"
            ? "Invalid email or password. Please try again."
            : "Could not create account. Please check your details."
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl lg:grid-cols-[1.05fr_0.95fr]">
        <section
          className="relative hidden overflow-hidden bg-cover bg-center p-10 text-white lg:flex lg:flex-col lg:justify-between"
          style={{
            backgroundImage: `url(${mode === "login" ? "/Background.jpg" : "/Background2.jpg"})`,
          }}
        >
          <div className="absolute inset-0 bg-black/65" />
          <div className="relative">
            <p className="mb-6 text-sm font-semibold uppercase tracking-[0.25em] text-yellow-400">
              Internal Platform
            </p>
            <h1 className="max-w-lg text-5xl font-bold leading-tight">
              Bertrandt Inventory System
            </h1>
            <p className="mt-6 max-w-xl text-lg text-gray-300">
              Manage electronic parts, reservations, borrowing, and purchase
              requests in one internal platform.
            </p>
          </div>
          <div className="relative rounded-2xl border border-white/10 bg-white/10 p-6 backdrop-blur-sm">
            <div className="mb-5 h-2 w-24 rounded-full bg-yellow-400" />
            <div className="grid grid-cols-3 gap-3">
              <div className="h-24 rounded-xl bg-yellow-400" />
              <div className="h-24 rounded-xl bg-white/20" />
              <div className="h-24 rounded-xl bg-gray-700" />
            </div>
          </div>
        </section>

        <div className="w-full max-w-md p-8 lg:mx-auto lg:self-center">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold">Stock Dashboard</h1>
              <p className="text-sm text-gray-500">
                {mode === "login" ? "Local access" : "Create collaborator account"}
              </p>
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
            {mode === "signup" && (
              <div>
                <label className="block text-sm font-semibold mb-2">Name</label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded border border-gray-300 px-4 py-2"
                  required
                />
              </div>
            )}

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
              <PasswordInput
                value={password}
                onChange={setPassword}
                isVisible={showPassword}
                onToggleVisibility={() => setShowPassword(!showPassword)}
              />
            </div>

            {mode === "signup" && (
              <>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Confirm Password
                  </label>
                  <PasswordInput
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    isVisible={showConfirmPassword}
                    onToggleVisibility={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <select
                    value={division}
                    onChange={(event) =>
                      setDivision(event.target.value as Division)
                    }
                    className="w-full rounded border border-gray-300 px-4 py-2"
                  >
                    {divisions
                      .filter((divisionName) => divisionName !== "Admin")
                      .map((divisionName) => (
                        <option key={divisionName}>{divisionName}</option>
                      ))}
                  </select>

                  <select
                    value={group}
                    onChange={(event) =>
                      setGroup(event.target.value as CollaboratorGroup)
                    }
                    className="w-full rounded border border-gray-300 px-4 py-2"
                  >
                    {collaboratorGroups.map((groupName) => (
                      <option key={groupName}>{groupName}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {mode === "login" && (
              <label className="inline-flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" className="rounded border-gray-300" />
                Remember me
              </label>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded bg-yellow-400 px-4 py-2 font-semibold text-black disabled:opacity-60"
            >
              {isSubmitting
                ? mode === "login"
                  ? "Signing in..."
                  : "Creating account..."
                : mode === "login"
                  ? "Login"
                  : "Sign Up"}
            </button>
          </form>

          <div className="mt-5 flex flex-col gap-2 text-center text-sm">
            <button
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login")
                setAuthError("")
                setForgotMessage("")
              }}
              className="font-semibold text-yellow-700"
            >
              {mode === "login"
                ? "Create a collaborator account"
                : "Back to login"}
            </button>

            {mode === "login" && (
              <button
                onClick={() => setIsForgotModalOpen(true)}
                className="text-gray-600 underline"
              >
                Forgot password?
              </button>
            )}

            {forgotMessage && (
              <p className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-gray-600">
                {forgotMessage}
              </p>
            )}
          </div>
        </div>
      </div>
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-xl font-bold">Password reset</h3>
            <p className="mt-3 text-gray-600">
              Please contact your StockDashboard administrator to reset your
              password.
            </p>
            {forgotMessage && (
              <p className="mt-4 rounded border border-green-200 bg-green-50 px-4 py-3 text-green-700">
                {forgotMessage}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setForgotMessage("")
                  setIsForgotModalOpen(false)
                }}
                className="rounded border px-4 py-2"
              >
                Close
              </button>
              <button
                onClick={() =>
                  setForgotMessage(
                    "Reset request noted. Please contact your StockDashboard administrator."
                  )
                }
                className="rounded bg-yellow-400 px-4 py-2 font-semibold text-black"
              >
                Send reset request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PasswordInput({
  value,
  onChange,
  isVisible,
  onToggleVisibility,
}: {
  value: string
  onChange: (value: string) => void
  isVisible: boolean
  onToggleVisibility: () => void
}) {
  return (
    <div className="relative">
      <input
        type={isVisible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded border border-gray-300 px-4 py-2 pr-12"
        required
      />
      <button
        type="button"
        onClick={onToggleVisibility}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
        title={isVisible ? "Hide password" : "Show password"}
      >
        {isVisible ? "Hide" : "Show"}
      </button>
    </div>
  )
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

function formatRequestedAt(value?: string) {
  if (!value) {
    return "-"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
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

function NotificationDropdown({
  summary,
  onNavigate,
  onMarkAllSeen,
}: {
  summary: NotificationSummary
  onNavigate: (item: NotificationItemSummary) => void
  onMarkAllSeen: () => void
}) {
  if (summary.totalUnread > 0 && summary.items.length === 0) {
    console.warn("Notification summary has pending count but no items", summary)
  }

  return (
    <div className="absolute right-0 top-14 z-20 w-96 rounded-lg bg-white p-4 text-black shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-bold">Notifications</h3>
        <div className="flex items-center gap-2">
          {summary.items.some((item) => item.type === "RequestUpdate") && (
            <button
              type="button"
              onClick={onMarkAllSeen}
              className="text-xs font-semibold text-blue-700 hover:underline"
            >
              Mark all as seen
            </button>
          )}
          <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800">
            {summary.totalUnread} pending
          </span>
        </div>
      </div>

      <div className="max-h-80 space-y-3 overflow-y-auto">
        {summary.items.map((item) => (
          <NotificationItem
            key={item.id}
            item={item}
            onClick={() => onNavigate(item)}
          />
        ))}
        {summary.totalUnread > 0 && summary.items.length === 0 && (
          <p className="rounded border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
            Pending actions exist but could not be loaded.
          </p>
        )}
        {summary.totalUnread === 0 && summary.items.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-500">
            No pending notifications.
          </p>
        )}
      </div>
    </div>
  )
}

function NotificationItem({
  item,
  onClick,
}: {
  item: NotificationItemSummary
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="block w-full rounded border border-gray-200 p-3 text-left transition hover:border-yellow-400 hover:bg-yellow-50"
    >
      <p className="font-semibold">{item.title}</p>
      <p className="text-sm text-gray-600">{item.description}</p>
      {item.createdAt && (
        <p className="mt-1 text-xs text-gray-500">
          {new Date(item.createdAt).toLocaleString()}
        </p>
      )}
    </button>
  )
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
  const adminCount = users.length
    ? users.filter((user) => user.role === "Admin").length
    : currentUser.role === "Admin"
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
          label="Admins"
          value={String(adminCount)}
          color="text-gray-900"
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

function Analytics({
  analyticsSummary,
  isLoadingAnalytics,
  analyticsError,
  currentUser,
  parts,
  partRequests,
  missingItemRequests,
  purchases,
  collaborators,
  users,
  lowStockThreshold,
}: {
  analyticsSummary: AnalyticsSummary | null
  isLoadingAnalytics: boolean
  analyticsError: string | null
  currentUser: AuthUser
  parts: Part[]
  partRequests: PartRequest[]
  missingItemRequests: MissingItemRequest[]
  purchases: Purchase[]
  collaborators: Collaborator[]
  users: AuthUser[]
  lowStockThreshold: number
}) {
  const inventoryByCategory =
    analyticsSummary?.inventoryByCategory.map((category) => ({
      name: category.category,
      value: category.count,
    })) || []
  const divisionAnalytics = analyticsSummary?.reservationsByDivision || []
  const groupAnalytics = analyticsSummary?.borrowedPartsByGroup || []

  async function downloadAnalyticsPdf() {
    if (!analyticsSummary) {
      return
    }

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
    const generatedAt = new Date()
    let y = 18

    try {
      const logo = await loadLogoDataUrl()
      doc.addImage(logo, "PNG", 14, 9, 38, 12)
    } catch {
      // The report remains usable if the optional logo cannot be loaded.
    }

    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("StockDashboard Inventory Report", 58, 17)
    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.text(`Generated: ${generatedAt.toLocaleString()}`, 58, 23)
    doc.text(
      `Generated by: ${currentUser.name} (${currentUser.role})`,
      58,
      28
    )
    y = 38

    const section = (title: string) => {
      if (y > 180) {
        doc.addPage()
        y = 16
      }
      doc.setFont("helvetica", "bold")
      doc.setFontSize(13)
      doc.text(title, 14, y)
      y += 5
    }
    const afterTable = () => {
      const tableDoc = doc as jsPDF & {
        lastAutoTable?: { finalY: number }
      }
      y = (tableDoc.lastAutoTable?.finalY || y) + 9
    }
    const table = (
      head: string[][],
      body: Array<Array<string | number>>,
      options: Record<string, unknown> = {}
    ) => {
      autoTable(doc, {
        startY: y,
        head,
        body: body.length ? body : [["No data available"]],
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [31, 41, 55] },
        ...options,
      })
      afterTable()
    }

    const availableQuantity = parts.reduce(
      (sum, part) => sum + (part.availableQuantity || 0),
      0
    )
    const reservedQuantity = parts.reduce(
      (sum, part) => sum + (part.reservedQuantity || 0),
      0
    )
    const borrowedQuantity = parts.reduce(
      (sum, part) => sum + (part.borrowedQuantity || 0),
      0
    )
    const damagedQuantity = parts.reduce(
      (sum, part) => sum + (part.damagedQuantity || 0),
      0
    )
    const pendingRequests =
      partRequests.filter((request) => request.status === "Pending").length +
      missingItemRequests.filter((request) => request.status === "Pending").length
    const pendingPurchases = purchases.filter((purchase) =>
      ["Pending", "Approved", "Ordered", "In Transit"].includes(purchase.status)
    ).length

    section("Executive Summary")
    table(
      [
        [
          "Total Parts",
          "Available",
          "Reserved",
          "Borrowed",
          "Damaged",
          "Low Stock",
          "Collaborators",
          "Pending Requests",
          "Pending Purchases",
        ],
      ],
      [
        [
          analyticsSummary.totalParts,
          availableQuantity,
          reservedQuantity,
          borrowedQuantity,
          damagedQuantity,
          analyticsSummary.lowStockParts,
          analyticsSummary.totalCollaborators,
          pendingRequests,
          pendingPurchases,
        ],
      ]
    )

    doc.addPage()
    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.text("Analytics Charts", 14, 16)
    const chartDefinitions = [
      {
        id: "analytics-inventory-category-chart",
        title: "Inventory by Category",
        x: 10,
        fallbackHead: [["Category", "Parts"]],
        fallbackBody: analyticsSummary.inventoryByCategory.map((item) => [
          item.category,
          item.count,
        ]),
      },
      {
        id: "analytics-reservations-division-chart",
        title: "Reservations by Division",
        x: 106,
        fallbackHead: [["Division", "Reserved", "Borrowed Qty"]],
        fallbackBody: analyticsSummary.reservationsByDivision.map((item) => [
          item.division,
          item.activeReservations,
          item.borrowedParts,
        ]),
      },
      {
        id: "analytics-borrowed-group-chart",
        title: "Borrowed Parts by Group",
        x: 202,
        fallbackHead: [["Group", "Borrowed Qty"]],
        fallbackBody: analyticsSummary.borrowedPartsByGroup.map((item) => [
          item.group,
          item.borrowedParts,
        ]),
      },
    ]
    const failedCharts: typeof chartDefinitions = []

    for (const chart of chartDefinitions) {
      doc.setFontSize(10)
      doc.text(chart.title, chart.x, 25)
      try {
        const image = await captureChartDataUrl(chart.id)
        doc.addImage(image, "PNG", chart.x, 29, 85, 58)
      } catch {
        failedCharts.push(chart)
        doc.setDrawColor(209, 213, 219)
        doc.rect(chart.x, 29, 85, 58)
        doc.setFont("helvetica", "normal")
        doc.setFontSize(9)
        doc.text("Chart unavailable. See table fallback.", chart.x + 5, 58)
      }
    }

    if (failedCharts.length > 0) {
      y = 100
      for (const chart of failedCharts) {
        section(`${chart.title} - Table Fallback`)
        table(chart.fallbackHead, chart.fallbackBody)
      }
    } else {
      y = 100
    }

    section("Inventory Overview")
    table(
      [
        [
          "Name",
          "Category",
          "Reference",
          "Total",
          "Available",
          "Reserved",
          "Borrowed",
          "Damaged",
          "Location",
          "Status",
        ],
      ],
      parts.map((part) => [
        part.name,
        part.category,
        part.reference,
        part.totalQuantity ?? part.quantity ?? 0,
        part.availableQuantity ?? part.quantity ?? 0,
        part.reservedQuantity ?? 0,
        part.borrowedQuantity ?? 0,
        part.damagedQuantity ?? 0,
        part.location,
        part.status,
      ]),
      { tableWidth: "auto" }
    )

    section("Requests Summary")
    table(
      [["Pending", "Borrowed", "Reserved", "Returned", "Damaged"]],
      [
        [
          pendingRequests,
          partRequests.filter((request) => request.status === "Borrowed").length,
          partRequests.filter((request) => request.status === "Reserved").length,
          partRequests.filter((request) => request.status === "Returned").length,
          partRequests.filter((request) => request.status === "Damaged").length,
        ],
      ]
    )

    section("Purchase Summary")
    table(
      [["Pending", "Ordered", "Received", "Cancelled"]],
      [
        [
          purchases.filter((purchase) => purchase.status === "Pending").length,
          purchases.filter((purchase) => purchase.status === "Ordered").length,
          purchases.filter((purchase) => purchase.status === "Received").length,
          purchases.filter((purchase) => purchase.status === "Cancelled").length,
        ],
      ]
    )

    section("Collaborator Summary")
    table(
      [["Collaborators", "Managers", "Admins", "Average Rating"]],
      [
        [
          collaborators.length,
          users.filter((user) => user.role === "Inventory Manager").length,
          users.filter((user) => user.role === "Admin").length,
          collaborators.length
            ? (
              collaborators.reduce(
                (sum, collaborator) => sum + (collaborator.rating || 0),
                0
              ) / collaborators.length
            ).toFixed(1)
            : "No data available",
        ],
      ]
    )
    table(
      [["Top Active Collaborator", "Reservations", "Borrowed"]],
      analyticsSummary.mostActiveCollaborators.slice(0, 10).map((item) => [
        item.collaboratorName,
        item.reservationCount,
        item.borrowedCount,
      ])
    )

    section("Low Stock")
    table(
      [["Part", "Reference", "Available", "Threshold", "Status"]],
      parts
        .filter((part) => (part.availableQuantity ?? part.quantity ?? 0) <= lowStockThreshold)
        .map((part) => [
          part.name,
          part.reference,
          part.availableQuantity ?? part.quantity ?? 0,
          lowStockThreshold,
          part.status,
        ])
    )

    addPdfFooter(doc)
    doc.save(`stockdashboard-report-${getTodayDate()}.pdf`)
  }

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
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-3xl font-bold">Analytics</h2>
        <button
          onClick={downloadAnalyticsPdf}
          className="inline-flex items-center justify-center gap-2 rounded bg-yellow-400 px-4 py-2 font-semibold text-black transition hover:bg-yellow-300"
        >
          <Download className="h-4 w-4" />
          Download PDF Report
        </button>
      </div>

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
          label="Damaged Parts"
          value={String(
            analyticsSummary.damagedParts ??
              parts.reduce((total, part) => total + part.damagedQuantity, 0)
          )}
          color="text-red-700"
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
        <ChartCard
          title="Inventory by Category"
          chartId="analytics-inventory-category-chart"
        >
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={inventoryByCategory}
                dataKey="value"
                nameKey="name"
                outerRadius={90}
                label
              >
                {inventoryByCategory.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={
                      categoryColorMap[entry.name] ||
                      categoryColorMap.Other ||
                      "#64748b"
                    }
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Reservations by Division"
          chartId="analytics-reservations-division-chart"
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={divisionAnalytics}>
              <XAxis dataKey="division" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar
                dataKey="activeReservations"
                name="Reserved requests"
                fill="#facc15"
              />
              <Bar
                dataKey="borrowedParts"
                name="Borrowed quantity"
                fill="#2563eb"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Borrowed Parts by Group"
          chartId="analytics-borrowed-group-chart"
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={groupAnalytics}>
              <XAxis dataKey="group" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar
                dataKey="borrowedParts"
                name="Borrowed quantity"
                fill="#2563eb"
              />
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
                <th className="text-left py-3 px-2">Available Quantity</th>
                <th className="text-left py-3 px-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {analyticsSummary.lowStockItems.map((part) => (
                <tr key={part.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-2 font-medium">{part.name}</td>
                  <td className="py-3 px-2">{part.category}</td>
                  <td className="py-3 px-2">{part.availableQuantity}</td>
                  <td className="py-3 px-2">
                    <PartStatusBadge status={part.status} />
                  </td>
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
                <th className="text-left py-3 px-2">Returned</th>
                <th className="text-left py-3 px-2">Damaged</th>
              </tr>
            </thead>
            <tbody>
              {divisionAnalytics.map((division) => (
                <tr key={division.division} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-2 font-medium">{division.division}</td>
                  <td className="py-3 px-2">{division.collaborators}</td>
                  <td className="py-3 px-2">{division.activeReservations}</td>
                  <td className="py-3 px-2">{division.borrowedParts}</td>
                  <td className="py-3 px-2">{division.returnedParts || 0}</td>
                  <td className="py-3 px-2">{division.damagedParts || 0}</td>
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
                <th className="text-left py-3 px-2">Returned</th>
                <th className="text-left py-3 px-2">Damaged</th>
              </tr>
            </thead>
            <tbody>
              {groupAnalytics.map((group) => (
                <tr key={group.group} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-2 font-medium">{group.group}</td>
                  <td className="py-3 px-2">{group.collaborators}</td>
                  <td className="py-3 px-2">{group.activeReservations}</td>
                  <td className="py-3 px-2">{group.borrowedParts}</td>
                  <td className="py-3 px-2">{group.returnedParts || 0}</td>
                  <td className="py-3 px-2">{group.damagedParts || 0}</td>
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
  reloadPurchases,
  setPartsError,
  canManageParts,
  canRequestParts,
  reloadRequests,
  reloadNotificationSummary,
  lowStockThreshold,
}: {
  parts: Part[]
  isLoadingParts: boolean
  partsError: string | null
  apiFetch: ApiFetch
  reloadParts: () => Promise<void>
  reloadAnalytics: () => Promise<void>
  reloadPurchases: () => Promise<void>
  setPartsError: React.Dispatch<React.SetStateAction<string | null>>
  canManageParts: boolean
  canRequestParts: boolean
  reloadRequests: () => Promise<void>
  reloadNotificationSummary: () => Promise<void>
  lowStockThreshold: number
}) {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("All Categories")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPart, setEditingPart] = useState<Part | null>(null)
  const [requestingPart, setRequestingPart] = useState<Part | null>(null)
  const [unavailablePart, setUnavailablePart] = useState<Part | null>(null)
  const [buyingPart, setBuyingPart] = useState<Part | null>(null)
  const purchaseSaveInFlight = useRef(false)
  const [page, setPage] = useState(1)

  const filteredParts = parts
    .filter((part) => {
      const matchesSearch =
        part.name.toLowerCase().includes(search.toLowerCase()) ||
        part.reference.toLowerCase().includes(search.toLowerCase())

      const matchesCategory =
        category === "All Categories" || part.category === category

      return matchesSearch && matchesCategory
    })
    .sort((firstPart, secondPart) =>
      firstPart.name.localeCompare(secondPart.name, undefined, {
        sensitivity: "base",
      })
    )
  const paginatedParts = getPageItems(filteredParts, page)

  useEffect(() => {
    setPage(1)
  }, [search, category])

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
    usageDate?: string
    startDate?: string
    dueDate?: string
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
      await reloadNotificationSummary()
      setRequestingPart(null)
    } catch {
      setPartsError("Failed to submit request")
    }
  }

  async function handleUnavailablePartRequest(input: {
    partId: number
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

      const response = await apiFetch(MISSING_ITEM_REQUESTS_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        throw new Error("Failed to create unavailable item request")
      }

      await reloadRequests()
      await reloadNotificationSummary()
      setUnavailablePart(null)
    } catch {
      setPartsError("Failed to ask manager for unavailable item")
    }
  }

  async function handleBuyPart(input: {
    itemName: string
    category: string
    manufacturer: string
    reference: string
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

      const response = await apiFetch(PURCHASES_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        throw new Error("Failed to create purchase request")
      }

      await reloadPurchases()
      await reloadNotificationSummary()
      setBuyingPart(null)
    } catch {
      setPartsError("Failed to create purchase request")
    } finally {
      purchaseSaveInFlight.current = false
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
        <p className="mb-4 text-sm text-gray-500">
          Low stock threshold: available quantity less than or equal to{" "}
          {lowStockThreshold}
        </p>
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
            <tr className="border-b bg-gray-100 text-xs uppercase text-gray-600">
              <th className="text-left py-3 px-2">Name</th>
              <th className="text-left py-3 px-2">Category</th>
              <th className="text-left py-3 px-2">Reference</th>
              <th className="text-left py-3 px-2">Total</th>
              <th className="text-left py-3 px-2">Available</th>
              <th className="text-left py-3 px-2">Reserved</th>
              <th className="text-left py-3 px-2">Borrowed</th>
              <th className="text-left py-3 px-2">Damaged</th>
              <th className="text-left py-3 px-2">Location</th>
              <th className="text-left py-3 px-2">Status</th>
              {(canManageParts || canRequestParts) && (
                <th className="w-44 px-2 py-3 text-left">Actions</th>
              )}
            </tr>
          </thead>

          <tbody>
            {paginatedParts.items.map((part) => (
              <tr key={part.id} className="border-b border-gray-100 transition hover:bg-gray-50">
                <td className="py-3 px-2 font-medium">{part.name}</td>
                <td className="py-3 px-2">{part.category}</td>
                <td className="py-3 px-2">{part.reference}</td>
                <td className="py-3 px-2">{part.totalQuantity ?? 0}</td>
                <td className="py-3 px-2">{part.availableQuantity ?? 0}</td>
                <td className="py-3 px-2">{part.reservedQuantity ?? 0}</td>
                <td className="py-3 px-2">{part.borrowedQuantity ?? 0}</td>
                <td className="py-3 px-2">{part.damagedQuantity ?? 0}</td>
                <td className="py-3 px-2">{part.location}</td>
                <td className="py-3 px-2">
                  <PartStatusBadge
                    status={getDisplayPartStatus(part, lowStockThreshold)}
                  />
                </td>
                {(canManageParts || canRequestParts) && (
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      {canManageParts && (
                        <>
                          <IconButton
                            icon={<Pencil className="h-4 w-4" />}
                            label={`Edit ${part.name}`}
                            tone="blue"
                            onClick={() => {
                              setEditingPart(part)
                              setIsModalOpen(true)
                            }}
                          />
                          <IconButton
                            icon={<ShoppingCart className="h-4 w-4" />}
                            label={`Purchase ${part.name}`}
                            tone="yellow"
                            onClick={() => setBuyingPart(part)}
                          />
                          <IconButton
                            icon={<Trash2 className="h-4 w-4" />}
                            label={`Delete ${part.name}`}
                            tone="red"
                            onClick={() => handleDelete(part.id)}
                          />
                        </>
                      )}

                      {canRequestParts && part.availableQuantity > 0 && (
                        <IconButton
                          icon={<FilePlus2 className="h-4 w-4" />}
                          label="Request this part"
                          tone="yellow"
                          onClick={() => setRequestingPart(part)}
                        />
                      )}
                      {canRequestParts && part.availableQuantity <= 0 && (
                        <IconButton
                          icon={<UserRoundSearch className="h-4 w-4" />}
                          label="Ask manager about this part"
                          tone="yellow"
                          onClick={() => setUnavailablePart(part)}
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
          page={paginatedParts.page}
          totalPages={paginatedParts.totalPages}
          start={paginatedParts.start}
          end={paginatedParts.end}
          total={filteredParts.length}
          onPageChange={setPage}
        />
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

      {unavailablePart && (
        <UnavailablePartRequestModal
          part={unavailablePart}
          onClose={() => setUnavailablePart(null)}
          onSave={handleUnavailablePartRequest}
        />
      )}

      {buyingPart && (
        <BuyPartModal
          part={buyingPart}
          onClose={() => setBuyingPart(null)}
          onSave={handleBuyPart}
        />
      )}
    </>
  )
}

function Collaborators({
  collaborators,
  isLoadingCollaborators,
  collaboratorsError,
  partRequests,
  users,
  apiFetch,
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
  apiFetch: ApiFetch
  reloadCollaborators: () => Promise<void>
  reloadAnalytics: () => Promise<void>
  setCollaboratorsError: React.Dispatch<React.SetStateAction<string | null>>
  canManageCollaborators: boolean
  currentUser: AuthUser
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
  const [ratingHistoryCollaborator, setRatingHistoryCollaborator] =
    useState<Collaborator | null>(null)
  const [page, setPage] = useState(1)

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
  const paginatedCollaborators = getPageItems(filteredCollaborators, page)

  useEffect(() => {
    setPage(1)
  }, [search, division, group])

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
            <tr className="border-b bg-gray-100 text-xs uppercase text-gray-600">
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
                  className="border-b border-gray-100 transition hover:bg-gray-50"
                >
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
                              onClick={() => handleDelete(collaborator.id)}
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
                      ? 10
                      : 9
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
          apiFetch={apiFetch}
          reloadCollaborators={reloadCollaborators}
          onClose={() => setRatingHistoryCollaborator(null)}
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
  apiFetch,
  reloadCollaborators,
  onClose,
}: {
  collaborator: Collaborator
  apiFetch: ApiFetch
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
        const response = await apiFetch(
          `${COLLABORATORS_API_URL}/${collaborator.id}/rating-history`
        )

        if (!response.ok) {
          throw new Error("Failed to load rating history")
        }

        setHistory((await response.json()) as RatingHistoryItem[])
      } catch {
        setError("Failed to load rating history")
      }
    }

    loadHistory()
  }, [collaborator.id])

  async function saveRating() {
    try {
      setError("")
      const response = await apiFetch(
        `${COLLABORATORS_API_URL}/${collaborator.id}/rating`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rating,
            reason: reason || "Manual rating adjustment",
          }),
        }
      )

      if (!response.ok) {
        throw new Error("Failed to update rating")
      }

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
  const [partPage, setPartPage] = useState(1)
  const [missingPage, setMissingPage] = useState(1)
  const actionablePartRequests = partRequests.filter(
    (request) =>
      request.status === "Pending" || request.status === "Return Pending"
  )
  const actionableMissingItemRequests = missingItemRequests.filter(
    (request) => request.status === "Pending"
  )
  const sortedPartRequests = sortWorkflowRequests(actionablePartRequests)
  const sortedMissingItemRequests = sortWorkflowRequests(
    actionableMissingItemRequests
  )
  const paginatedPartRequests = getPageItems(sortedPartRequests, partPage)
  const paginatedMissingRequests = getPageItems(
    sortedMissingItemRequests,
    missingPage
  )

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

        <table className="w-full min-w-[1240px]">
          <thead>
            <tr className="border-b bg-gray-100 text-xs uppercase text-gray-600">
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
                className={`border-b border-gray-100 transition hover:bg-gray-50 ${isHighlightTarget(
                  highlightTarget,
                  "Requests",
                  "PartRequests",
                  request.id
                )
                  ? "bg-yellow-100"
                  : ""
                  }`}
              >
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
                  {request.reason}
                </td>
                <td className="px-3 py-4">
                  <StatusPill status={request.status} />
                </td>
                <td className="max-w-48 px-3 py-4 text-sm text-gray-600">
                  {request.managerComment || "-"}
                </td>
                {canApproveRequests && (
                  <td className="px-3 py-4">
                    <div className="flex flex-wrap gap-2">
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

        <table className="w-full min-w-[1180px]">
          <thead>
            <tr className="border-b bg-gray-100 text-xs uppercase text-gray-600">
              <th className="px-3 py-3 text-left">Collaborator</th>
              <th className="px-3 py-3 text-left">Item</th>
              <th className="px-3 py-3 text-left">Category</th>
              <th className="px-3 py-3 text-left">Manufacturer</th>
              <th className="px-3 py-3 text-left">Reference</th>
              <th className="px-3 py-3 text-left">Quantity</th>
              <th className="px-3 py-3 text-left">Requested At</th>
              <th className="px-3 py-3 text-left">Needed Date</th>
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
                className={`border-b border-gray-100 transition hover:bg-gray-50 ${isHighlightTarget(
                  highlightTarget,
                  "Requests",
                  "MissingItemRequests",
                  request.id
                )
                  ? "bg-yellow-100"
                  : ""
                  }`}
              >
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
                <td className="px-3 py-4">
                  <StatusPill status={request.status} />
                </td>
                <td className="max-w-48 px-3 py-4 text-sm text-gray-600">
                  {request.managerComment || "-"}
                </td>
                {canApproveRequests && (
                  <td className="px-3 py-4">
                    {request.status === "Pending" && (
                      <div className="flex items-center gap-2">
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
                      </div>
                    )}
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

function SuppliersPage({
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
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [page, setPage] = useState(1)

  const filteredSuppliers = suppliers.filter((supplier) => {
    const normalizedSearch = search.toLowerCase()
    return (
      supplier.name.toLowerCase().includes(normalizedSearch) ||
      supplier.contactPerson.toLowerCase().includes(normalizedSearch) ||
      supplier.email.toLowerCase().includes(normalizedSearch) ||
      supplier.country.toLowerCase().includes(normalizedSearch)
    )
  })
  const paginatedSuppliers = getPageItems(filteredSuppliers, page)

  useEffect(() => {
    setPage(1)
  }, [search])

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

        <input
          type="text"
          placeholder="Search suppliers..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="mb-6 w-full rounded border border-gray-300 px-4 py-2 md:w-80"
        />

        <table className="w-full min-w-[1100px]">
          <thead>
            <tr className="border-b bg-gray-100 text-xs uppercase text-gray-600">
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
              <tr key={supplier.id} className="border-b hover:bg-gray-50">
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
                          onClick={() => handleDelete(supplier.id)}
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
                  colSpan={canEditSuppliers ? 8 : 7}
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
                <td className="py-3 px-2">
                  <StatusPill status={request.status} />
                </td>
                <td className="py-3 px-2">
                  {request.managerComment || "-"}
                </td>
                <td className="w-28 py-3 px-2">
                  <div className="flex items-center gap-2">
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
              <th className="text-left py-3 px-2">Status</th>
              <th className="text-left py-3 px-2">Manager Comment</th>
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
    </>
  )
}

function PurchasesPage({
  purchases,
  suppliers,
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
  const [page, setPage] = useState(1)
  const purchaseSaveInFlight = useRef(false)
  const isAdmin = currentUser.role === "Admin"
  const paginatedPurchases = getPageItems(purchases, page)

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

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold">Purchase</h2>
          <p className="text-gray-500">
            Request and receive needed electronic parts.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="rounded bg-yellow-400 px-4 py-2 font-semibold text-black"
        >
          + Purchase Request
        </button>
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

        <table className="w-full min-w-[1180px]">
          <thead>
            <tr className="border-b bg-gray-100">
              <th className="px-2 py-3 text-left">Item</th>
              <th className="px-2 py-3 text-left">Category</th>
              <th className="px-2 py-3 text-left">Reference</th>
              <th className="px-2 py-3 text-left">Quantity</th>
              <th className="px-2 py-3 text-left">Priority</th>
              <th className="px-2 py-3 text-left">Division</th>
              <th className="px-2 py-3 text-left">Status</th>
              <th className="px-2 py-3 text-left">Supplier</th>
              <th className="px-2 py-3 text-left">Expected Arrival</th>
              <th className="px-2 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedPurchases.items.map((purchase) => (
              <tr
                id={`PurchaseRequests-${purchase.id}`}
                key={purchase.id}
                className={`border-b hover:bg-gray-50 ${isHighlightTarget(
                  highlightTarget,
                  "Purchase",
                  "PurchaseRequests",
                  purchase.id
                )
                  ? "bg-yellow-100"
                  : ""
                  }`}
              >
                <td className="px-2 py-3 font-medium">{purchase.itemName}</td>
                <td className="px-2 py-3">{purchase.category}</td>
                <td className="px-2 py-3">{purchase.reference || "-"}</td>
                <td className="px-2 py-3">{purchase.quantity}</td>
                <td className="px-2 py-3">{purchase.priority}</td>
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
                    <IconButton
                      icon={<Pencil className="h-4 w-4" />}
                      label="Edit purchase"
                      onClick={() => {
                        setEditingPurchase(purchase)
                        setIsModalOpen(true)
                      }}
                      tone="blue"
                    />
                    {isAdmin && purchase.status === "Pending" && (
                      <IconButton
                        icon={<CheckCircle className="h-4 w-4" />}
                        label="Approve purchase"
                        onClick={() => updateStatus(purchase.id, "approve")}
                        tone="green"
                      />
                    )}
                    {isAdmin && purchase.status === "Approved" && (
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
                    {isAdmin &&
                      !["Received", "Cancelled"].includes(purchase.status) && (
                      <IconButton
                        icon={<XCircle className="h-4 w-4" />}
                        label="Cancel purchase"
                        onClick={() => updateStatus(purchase.id, "cancel")}
                        tone="neutral"
                      />
                    )}
                    {isAdmin && (
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
            ))}
            {purchases.length === 0 && (
              <tr>
                <td colSpan={10} className="py-8 text-center text-gray-500">
                  No purchase requests yet.
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
          }}
          onSave={savePurchase}
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
}: {
  purchase: Purchase | null
  suppliers: Supplier[]
  currentUser: AuthUser
  onClose: () => void
  onSave: (purchase: Partial<Purchase>) => void
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-2xl font-bold">
          {purchase ? "Edit Purchase Request" : "New Purchase Request"}
        </h3>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-semibold text-gray-700">Item name</span>
            <input
              value={form.itemName}
              onChange={(event) => updateField("itemName", event.target.value)}
              className="w-full rounded border px-4 py-2"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-semibold text-gray-700">Category</span>
            <select
              value={form.category}
              onChange={(event) => updateField("category", event.target.value)}
              className="w-full rounded border px-4 py-2"
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
              className="w-full rounded border px-4 py-2"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-semibold text-gray-700">Reference</span>
            <input
              value={form.reference}
              onChange={(event) => updateField("reference", event.target.value)}
              className="w-full rounded border px-4 py-2"
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
              onChange={(event) =>
                updateField("quantity", Number(event.target.value))
              }
              className="w-full rounded border px-4 py-2"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-semibold text-gray-700">Priority</span>
            <select
              value={form.priority}
              onChange={(event) =>
                updateField("priority", event.target.value as PurchasePriority)
              }
              className="w-full rounded border px-4 py-2"
            >
              {["Low", "Medium", "High", "Critical"].map((priority) => (
                <option key={priority}>{priority}</option>
              ))}
            </select>
          </label>
          {isAdmin && (
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
          {isAdmin && (
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
              className="min-h-24 w-full rounded border px-4 py-2"
            />
          </label>
          {isAdmin && (
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
            onClick={() => onSave(form)}
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

function SettingsPage({
  users,
  usersError,
  apiFetch,
  reloadUsers,
  setUsersError,
  appSettings,
  settingsError,
  settingsSuccess,
  apiReloadSettings,
  setSettingsError,
  setSettingsSuccess,
  highlightTarget,
  reloadNotificationSummary,
}: {
  users: AuthUser[]
  usersError: string | null
  apiFetch: ApiFetch
  reloadUsers: () => Promise<void>
  setUsersError: React.Dispatch<React.SetStateAction<string | null>>
  appSettings: AppSettings
  settingsError: string | null
  settingsSuccess: string
  apiReloadSettings: () => Promise<void>
  setSettingsError: React.Dispatch<React.SetStateAction<string | null>>
  setSettingsSuccess: React.Dispatch<React.SetStateAction<string>>
  highlightTarget: {
    targetPage: string
    targetSection?: string
    targetId?: number
  } | null
  reloadNotificationSummary: () => Promise<void>
}) {
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id || 0)
  const selectedUser = users.find((user) => user.id === selectedUserId) || users[0]
  const [role, setRole] = useState<UserRole>(selectedUser?.role || "Viewer")
  const [managedDivision, setManagedDivision] = useState<Division>(
    (selectedUser?.managedDivision as Division) || "Division 1"
  )
  const [lowStockThreshold, setLowStockThreshold] = useState(
    appSettings.lowStockThreshold
  )
  const [verificationPage, setVerificationPage] = useState(1)
  const [usersPage, setUsersPage] = useState(1)

  useEffect(() => {
    if (!selectedUser) {
      return
    }

    setRole(selectedUser.role)
    setManagedDivision((selectedUser.managedDivision as Division) || "Division 1")
  }, [selectedUserId, users.length])

  useEffect(() => {
    setLowStockThreshold(appSettings.lowStockThreshold)
  }, [appSettings.lowStockThreshold])

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

  async function handleSaveLowStockThreshold() {
    try {
      setSettingsError(null)
      setSettingsSuccess("")
      const response = await apiFetch(`${SETTINGS_API_URL}/low-stock-threshold`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ lowStockThreshold }),
      })

      if (!response.ok) {
        throw new Error("Failed to update threshold")
      }

      await apiReloadSettings()
      setSettingsSuccess("Low stock threshold saved.")
    } catch {
      setSettingsSuccess("")
      setSettingsError("Failed to update low stock threshold")
    }
  }

  async function updateVerificationStatus(
    userId: number,
    action: "verify" | "reject"
  ) {
    try {
      setUsersError(null)
      const response = await apiFetch(`${USERS_API_URL}/${userId}/${action}`, {
        method: "PUT",
      })

      if (!response.ok) {
        throw new Error("Failed to update user verification")
      }

      await reloadUsers()
      await reloadNotificationSummary()
    } catch {
      setUsersError("Failed to update user verification")
    }
  }

  const pendingUsers = users.filter(
    (user) => user.emailVerificationStatus === "Pending"
  )
  const paginatedPendingUsers = getPageItems(pendingUsers, verificationPage)
  const paginatedUsers = getPageItems(users, usersPage)

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

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h3 className="text-xl font-bold mb-2">Low Stock Threshold</h3>
        <p className="mb-4 text-sm text-gray-500">
          Items with quantity less than or equal to this value are marked as Low
          Stock.
        </p>
        {settingsError && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {settingsError}
          </div>
        )}
        {settingsSuccess && (
          <div className="mb-4 rounded border border-green-200 bg-green-50 px-4 py-3 text-green-700">
            {settingsSuccess}
          </div>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="number"
            min={0}
            value={lowStockThreshold}
            onChange={(event) =>
              setLowStockThreshold(Number(event.target.value))
            }
            className="rounded border px-4 py-2 sm:w-48"
          />
          <button
            onClick={handleSaveLowStockThreshold}
            disabled={lowStockThreshold < 0}
            className="rounded bg-yellow-400 px-4 py-2 font-semibold text-black disabled:opacity-60"
          >
            Save Threshold
          </button>
        </div>
      </div>

      <div
        id="UserVerification"
        className={`bg-white rounded-lg shadow p-6 mb-8 overflow-x-auto ${isHighlightTarget(highlightTarget, "Settings", "UserVerification")
          ? "ring-4 ring-yellow-300"
          : ""
          }`}
      >
        <h3 className="text-xl font-bold mb-4">User Verification</h3>
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="border-b bg-gray-100">
              <th className="text-left py-3 px-2">Name</th>
              <th className="text-left py-3 px-2">Email</th>
              <th className="text-left py-3 px-2">Division</th>
              <th className="text-left py-3 px-2">Status</th>
              <th className="text-left py-3 px-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedPendingUsers.items.map((user) => (
              <tr
                id={`UserVerification-${user.id}`}
                key={user.id}
                className={`border-b hover:bg-gray-50 ${isHighlightTarget(
                  highlightTarget,
                  "Settings",
                  "UserVerification",
                  user.id
                )
                  ? "bg-yellow-100"
                  : ""
                  }`}
              >
                <td className="py-3 px-2 font-medium">{user.name}</td>
                <td className="py-3 px-2">{user.email}</td>
                <td className="py-3 px-2">{user.division}</td>
                <td className="py-3 px-2">{user.emailVerificationStatus}</td>
                <td className="w-24 py-3 px-2">
                  <div className="flex items-center gap-2">
                    <IconButton
                      icon={<CheckCircle className="h-4 w-4" />}
                      label="Verify user"
                      onClick={() => updateVerificationStatus(user.id, "verify")}
                      tone="green"
                    />
                    <IconButton
                      icon={<XCircle className="h-4 w-4" />}
                      label="Reject user"
                      onClick={() => updateVerificationStatus(user.id, "reject")}
                      tone="red"
                    />
                  </div>
                </td>
              </tr>
            ))}
            {pendingUsers.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500">
                  No pending users.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination
          page={paginatedPendingUsers.page}
          totalPages={paginatedPendingUsers.totalPages}
          start={paginatedPendingUsers.start}
          end={paginatedPendingUsers.end}
          total={paginatedPendingUsers.total}
          onPageChange={setVerificationPage}
        />
      </div>

      <div className="bg-white rounded-lg shadow p-6 overflow-x-auto">
        <h3 className="text-xl font-bold mb-4">System Preferences</h3>
        <p className="mb-6 text-sm text-gray-500">
          App name: {appSettings.appName}
        </p>

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
            {paginatedUsers.items.map((user) => (
              <tr key={user.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-2 font-medium">{user.name}</td>
                <td className="py-3 px-2">{user.email}</td>
                <td className="py-3 px-2">{user.role}</td>
                <td className="py-3 px-2">{user.division}</td>
                <td className="py-3 px-2">{user.managedDivision || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination
          page={paginatedUsers.page}
          totalPages={paginatedUsers.totalPages}
          start={paginatedUsers.start}
          end={paginatedUsers.end}
          total={paginatedUsers.total}
          onPageChange={setUsersPage}
        />
      </div>
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
  const [page, setPage] = useState(1)
  const operationalRequests = partRequests.filter(
    (request) =>
      request.status === "Reserved" ||
      request.status === "Borrowed" ||
      request.status === "Return Pending" ||
      request.status === "Returned" ||
      request.status === "Damaged"
  )
  const paginatedRequests = getPageItems(operationalRequests, page)

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

        <table className="w-full min-w-[1120px]">
          <thead>
            <tr className="border-b bg-gray-100">
              <th className="text-left py-3 px-2">Collaborator</th>
              <th className="text-left py-3 px-2">Part</th>
              <th className="text-left py-3 px-2">Request Type</th>
              <th className="text-left py-3 px-2">Quantity</th>
              <th className="text-left py-3 px-2">Start Date</th>
              <th className="text-left py-3 px-2">Due Date</th>
              <th className="text-left py-3 px-2">Status</th>
              <th className="text-left py-3 px-2">Manager Comment</th>
              {canManageReservations && (
                <th className="text-left py-3 px-2">Actions</th>
              )}
            </tr>
          </thead>

          <tbody>
            {paginatedRequests.items.map((request) => (
              <tr key={request.id} className="border-b border-gray-100 transition hover:bg-gray-50">
                <td className="py-3 px-2 font-medium">
                  {request.collaborator?.name || "Unknown collaborator"}
                </td>
                <td className="py-3 px-2">{request.part?.name || "Unknown part"}</td>
                <td className="py-3 px-2">{request.requestType}</td>
                <td className="py-3 px-2">{request.quantity}</td>
                <td className="py-3 px-2">
                  {getRequestStartDate(request)}
                </td>
                <td className="py-3 px-2">
                  {getRequestDueDate(request)}
                </td>
                <td className="py-3 px-2">
                  <StatusPill status={request.status} />
                </td>
                <td className="py-3 px-2">{request.managerComment || "-"}</td>
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

            {operationalRequests.length === 0 && (
              <tr>
                <td
                  colSpan={canManageReservations ? 9 : 8}
                  className="py-8 text-center text-gray-500"
                >
                  No approved reservations or borrowed requests yet.
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

      {viewingReturnReport && (
        <ReturnReportModal
          request={viewingReturnReport}
          onClose={() => setViewingReturnReport(null)}
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
    usageDate?: string
    startDate?: string
    dueDate?: string
    reason: string
  }) => void
}) {
  const [form, setForm] = useState({
    partId: part.id,
    quantity: 1,
    requestType: "Reservation" as "Reservation" | "Borrow",
    usageDate: "",
    startDate: "",
    dueDate: "",
    reason: "",
  })
  const hasInvalidQuantity =
    form.quantity <= 0 || form.quantity > part.availableQuantity
  const hasInvalidBorrowDates =
    form.requestType === "Borrow" &&
    Boolean(form.startDate && form.dueDate && form.dueDate < form.startDate)
  const hasPastDate =
    form.requestType === "Reservation"
      ? isPastDate(form.usageDate)
      : isPastDate(form.startDate) || isPastDate(form.dueDate)
  const isMissingDate =
    form.requestType === "Reservation"
      ? !form.usageDate
      : !form.startDate || !form.dueDate

  function updateField(field: keyof typeof form, value: string | number) {
    setForm({ ...form, [field]: value })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-[500px]">
        <h3 className="text-2xl font-bold mb-2">Request Part</h3>
        <p className="text-gray-600 mb-6">
          {part.name} - {part.availableQuantity} available
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
            max={part.availableQuantity}
            value={form.quantity}
            onChange={(e) => updateField("quantity", Number(e.target.value))}
            className="w-full border rounded px-4 py-2"
          />
          {hasInvalidQuantity && (
            <p className="text-sm text-red-600">
              Quantity must be greater than 0 and no more than available stock
            </p>
          )}

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

          {form.requestType === "Reservation" ? (
            <input
              type="date"
              min={getTodayDate()}
              value={form.usageDate}
              onChange={(e) => updateField("usageDate", e.target.value)}
              className="w-full border rounded px-4 py-2"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="date"
                min={getTodayDate()}
                value={form.startDate}
                onChange={(e) => updateField("startDate", e.target.value)}
                className="w-full border rounded px-4 py-2"
              />
              <input
                type="date"
                min={form.startDate || getTodayDate()}
                value={form.dueDate}
                onChange={(e) => updateField("dueDate", e.target.value)}
                className="w-full border rounded px-4 py-2"
              />
            </div>
          )}
          {hasInvalidBorrowDates && (
            <p className="text-sm text-red-600">
              Due date must be after or equal start date
            </p>
          )}
          {hasPastDate && (
            <p className="text-sm text-red-600">Date cannot be in the past</p>
          )}

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
              form.quantity > part.availableQuantity ||
              isMissingDate ||
              hasInvalidBorrowDates ||
              hasPastDate ||
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

function UnavailablePartRequestModal({
  part,
  onClose,
  onSave,
}: {
  part: Part
  onClose: () => void
  onSave: (request: {
    partId: number
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
    partId: part.id,
    itemName: part.name,
    category: part.category,
    manufacturer: part.manufacturer,
    reference: part.reference,
    quantityNeeded: 1,
    reason: "",
    neededDate: "",
  })
  const hasInvalidQuantity = form.quantityNeeded <= 0
  const hasPastNeededDate = isPastDate(form.neededDate)

  function updateField(field: keyof typeof form, value: string | number) {
    setForm({ ...form, [field]: value })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-[500px]">
        <h3 className="text-2xl font-bold mb-2">Ask Manager</h3>
        <p className="text-gray-600 mb-6">
          {part.name} is not currently available.
        </p>

        <div className="space-y-4">
          <input
            value={`${part.name} (${part.reference})`}
            className="w-full border rounded px-4 py-2 bg-gray-100"
            disabled
          />
          <input
            type="number"
            min={1}
            value={form.quantityNeeded}
            onChange={(event) =>
              updateField("quantityNeeded", Number(event.target.value))
            }
            className="w-full border rounded px-4 py-2"
          />
          {hasInvalidQuantity && (
            <p className="text-sm text-red-600">
              Quantity must be greater than 0
            </p>
          )}
          <input
            type="date"
            min={getTodayDate()}
            value={form.neededDate}
            onChange={(event) => updateField("neededDate", event.target.value)}
            className="w-full border rounded px-4 py-2"
          />
          {hasPastNeededDate && (
            <p className="text-sm text-red-600">Date cannot be in the past</p>
          )}
          <textarea
            placeholder="Reason / urgency"
            value={form.reason}
            onChange={(event) => updateField("reason", event.target.value)}
            className="w-full border rounded px-4 py-2 min-h-28"
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 border rounded">
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={
              hasInvalidQuantity ||
              hasPastNeededDate ||
              !form.reason ||
              !form.neededDate
            }
            className="px-4 py-2 bg-yellow-400 text-black font-semibold rounded disabled:opacity-60"
          >
            Send Request
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
  onSave: (purchase: {
    itemName: string
    category: string
    manufacturer: string
    reference: string
    quantity: number
    reason: string
    priority: PurchasePriority
  }) => void
}) {
  const [form, setForm] = useState({
    itemName: part.name,
    category: part.category,
    manufacturer: part.manufacturer,
    reference: part.reference,
    quantity: 1,
    reason: "",
    priority: "Medium" as PurchasePriority,
  })
  const hasInvalidQuantity = form.quantity <= 0

  function updateField(field: keyof typeof form, value: string | number) {
    setForm({ ...form, [field]: value })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-2xl font-bold mb-2">Buy Part</h3>
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
            value={form.quantity}
            onChange={(event) => updateField("quantity", Number(event.target.value))}
            className="w-full rounded border px-4 py-2"
          />
          {hasInvalidQuantity && (
            <p className="text-sm text-red-600">
              Quantity must be greater than 0
            </p>
          )}
          <select
            value={form.priority}
            onChange={(event) =>
              updateField("priority", event.target.value as PurchasePriority)
            }
            className="w-full rounded border px-4 py-2"
          >
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
            <option>Critical</option>
          </select>
          <textarea
            placeholder="Reason"
            value={form.reason}
            onChange={(event) => updateField("reason", event.target.value)}
            className="min-h-28 w-full rounded border px-4 py-2"
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded border px-4 py-2">
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={hasInvalidQuantity || !form.reason.trim()}
            className="rounded bg-yellow-400 px-4 py-2 font-semibold text-black disabled:opacity-60"
          >
            Create Purchase
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
  const hasInvalidQuantity = form.quantityNeeded <= 0
  const hasPastNeededDate = isPastDate(form.neededDate)

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
          {hasInvalidQuantity && (
            <p className="text-sm text-red-600">
              Quantity must be greater than 0
            </p>
          )}

          <input
            type="date"
            min={getTodayDate()}
            value={form.neededDate}
            onChange={(e) => updateField("neededDate", e.target.value)}
            className="w-full border rounded px-4 py-2"
          />
          {hasPastNeededDate && (
            <p className="text-sm text-red-600">Date cannot be in the past</p>
          )}

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
              hasInvalidQuantity ||
              hasPastNeededDate ||
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

function getActionCommentConfig(
  action: "approve" | "reject" | "return" | "mark-damaged"
) {
  if (action === "approve") {
    return {
      title: "Approve Request",
      message: "Add an optional manager comment.",
      confirmLabel: "Approve",
      isCommentRequired: false,
    }
  }

  if (action === "reject") {
    return {
      title: "Reject Request",
      message: "Please provide a rejection reason.",
      confirmLabel: "Reject",
      isCommentRequired: true,
    }
  }

  if (action === "mark-damaged") {
    return {
      title: "Mark Damaged/Lost",
      message: "Describe the damage or loss.",
      confirmLabel: "Mark Damaged",
      isCommentRequired: true,
    }
  }

  return {
    title: "Mark as Returned",
    message: "Add return note.",
    confirmLabel: "Mark Returned",
    isCommentRequired: false,
  }
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
  }) => void
}) {
  const [goodQuantity, setGoodQuantity] = useState(request.quantity)
  const [damagedQuantity, setDamagedQuantity] = useState(0)
  const [comment, setComment] = useState("")
  const isCommentRequired = damagedQuantity > 0 && !comment.trim()
  const isInvalid =
    goodQuantity < 0 ||
    goodQuantity > request.quantity ||
    damagedQuantity < 0 ||
    damagedQuantity > request.quantity ||
    isCommentRequired

  function updateGoodQuantity(value: number) {
    const boundedValue = Math.min(request.quantity, Math.max(0, value))
    setGoodQuantity(boundedValue)
    setDamagedQuantity(request.quantity - boundedValue)
  }

  function updateDamagedQuantity(value: number) {
    const boundedValue = Math.min(request.quantity, Math.max(0, value))
    setDamagedQuantity(boundedValue)
    setGoodQuantity(request.quantity - boundedValue)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-2xl font-bold">Declare Return</h3>
        <p className="mt-2 text-gray-600">
          Declare the condition of {request.part?.name || "this item"} before
          manager confirmation.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-semibold text-gray-700">
              Good / Available quantity
            </span>
            <input
              type="number"
              min={0}
              max={request.quantity}
              value={goodQuantity}
              onChange={(event) => updateGoodQuantity(Number(event.target.value))}
              className="w-full rounded border px-4 py-2"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-semibold text-gray-700">
              Damaged quantity
            </span>
            <input
              type="number"
              min={0}
              max={request.quantity}
              value={damagedQuantity}
              onChange={(event) =>
                updateDamagedQuantity(Number(event.target.value))
              }
              className="w-full rounded border px-4 py-2"
            />
          </label>
        </div>

        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Collaborator comment"
          className="mt-4 min-h-28 w-full rounded border px-4 py-2"
        />
        {isCommentRequired && (
          <p className="mt-2 text-sm text-red-600">
            Comment is required when there is a damaged item.
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded border px-4 py-2">
            Cancel
          </button>
          <button
            onClick={() =>
              onDeclare({ goodQuantity, damagedQuantity, comment: comment.trim() })
            }
            disabled={isInvalid}
            className="rounded bg-yellow-400 px-4 py-2 font-semibold text-black disabled:opacity-60"
          >
            Declare Return
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
  const damagedQuantity =
    request.confirmedDamagedQuantity ?? request.returnDamagedQuantity ?? 0
  const hasDamage = damagedQuantity > 0 || request.status === "Damaged"
  const reportRows = [
    ["Declared good quantity", request.returnGoodQuantity ?? "-"],
    ["Declared damaged quantity", request.returnDamagedQuantity ?? "-"],
    ["Collaborator comment", request.returnComment || "-"],
    ["Confirmed good quantity", request.confirmedGoodQuantity ?? "-"],
    ["Confirmed damaged quantity", request.confirmedDamagedQuantity ?? "-"],
    [
      "Manager comment",
      request.returnManagerComment || request.managerComment || "-",
    ],
    ["Return declared at", formatRequestedAt(request.returnDeclaredAt || undefined)],
    ["Return confirmed at", formatRequestedAt(request.returnConfirmedAt || undefined)],
  ]

  async function downloadReturnReportPdf() {
    const doc = new jsPDF({ unit: "mm", format: "a4" })
    const generatedAt = new Date()

    try {
      const logo = await loadLogoDataUrl()
      doc.addImage(logo, "PNG", 14, 10, 42, 13)
    } catch {
      // The report remains usable if the optional logo cannot be loaded.
    }

    doc.setFont("helvetica", "bold")
    doc.setFontSize(20)
    doc.text("Return Report", 14, 36)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.text(`Request #${request.id}`, 14, 43)

    autoTable(doc, {
      startY: 50,
      head: [["Field", "Details"]],
      body: [
        ["Collaborator", request.collaborator?.name || "Unknown"],
        ["Collaborator email", request.collaborator?.email || "Unknown"],
        ["Part", request.part?.name || "Unknown"],
        ["Reference", request.part?.reference || "-"],
        ["Request type", request.requestType],
        ["Original quantity", request.quantity],
        ...reportRows,
        ["Status", request.status],
        ["Generated date", generatedAt.toLocaleString()],
      ].map(([label, value]) => [String(label), String(value)]),
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [31, 41, 55] },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 55 },
      },
    })

    addPdfFooter(doc)
    doc.save(`return-report-request-${request.id}.pdf`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold">Return Report</h3>
            <p className="mt-1 text-sm text-gray-500">
              {request.part?.name || "Part"} requested by{" "}
              {request.collaborator?.name || "collaborator"}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${hasDamage
              ? "bg-red-100 text-red-800"
              : "bg-green-100 text-green-800"
              }`}
          >
            {hasDamage && <CircleAlert className="h-4 w-4" />}
            {hasDamage ? "Damage reported" : "Returned successfully"}
          </span>
        </div>

        <dl className="mt-6 divide-y divide-gray-100 rounded border border-gray-200">
          {reportRows.map(([label, value]) => (
            <div
              key={String(label)}
              className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[190px_1fr]"
            >
              <dt className="text-sm font-semibold text-gray-600">{label}</dt>
              <dd className="text-sm text-gray-900">{String(value)}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 flex flex-col-reverse justify-end gap-3 sm:flex-row">
          <button
            onClick={onClose}
            className="rounded bg-gray-900 px-4 py-2 font-semibold text-white hover:bg-gray-800"
          >
            Close
          </button>
          <button
            onClick={downloadReturnReportPdf}
            className="inline-flex items-center justify-center gap-2 rounded bg-yellow-400 px-4 py-2 font-semibold text-black transition hover:bg-yellow-300"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </button>
        </div>
      </div>
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
  }) => void
}) {
  const [confirmedGoodQuantity, setConfirmedGoodQuantity] = useState(
    request.returnGoodQuantity ?? request.quantity
  )
  const [confirmedDamagedQuantity, setConfirmedDamagedQuantity] = useState(
    request.returnDamagedQuantity ?? 0
  )
  const [managerComment, setManagerComment] = useState("")
  const isCommentRequired =
    confirmedDamagedQuantity > 0 && !managerComment.trim()
  const isInvalid =
    confirmedGoodQuantity < 0 ||
    confirmedGoodQuantity > request.quantity ||
    confirmedDamagedQuantity < 0 ||
    confirmedDamagedQuantity > request.quantity ||
    isCommentRequired

  function updateConfirmedGoodQuantity(value: number) {
    const boundedValue = Math.min(request.quantity, Math.max(0, value))
    setConfirmedGoodQuantity(boundedValue)
    setConfirmedDamagedQuantity(request.quantity - boundedValue)
  }

  function updateConfirmedDamagedQuantity(value: number) {
    const boundedValue = Math.min(request.quantity, Math.max(0, value))
    setConfirmedDamagedQuantity(boundedValue)
    setConfirmedGoodQuantity(request.quantity - boundedValue)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-2xl font-bold">Confirm Return</h3>
        <p className="mt-2 text-gray-600">
          Review the collaborator declaration and confirm stock movement.
        </p>

        <div className="mt-5 rounded border bg-gray-50 p-4 text-sm text-gray-700">
          <p>
            <span className="font-semibold">Declared good:</span>{" "}
            {request.returnGoodQuantity ?? 0}
          </p>
          <p>
            <span className="font-semibold">Declared damaged:</span>{" "}
            {request.returnDamagedQuantity ?? 0}
          </p>
          <p>
            <span className="font-semibold">Collaborator comment:</span>{" "}
            {request.returnComment || "-"}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-semibold text-gray-700">
              Confirmed good quantity
            </span>
            <input
              type="number"
              min={0}
              max={request.quantity}
              value={confirmedGoodQuantity}
              onChange={(event) =>
                updateConfirmedGoodQuantity(Number(event.target.value))
              }
              className="w-full rounded border px-4 py-2"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-semibold text-gray-700">
              Confirmed damaged quantity
            </span>
            <input
              type="number"
              min={0}
              max={request.quantity}
              value={confirmedDamagedQuantity}
              onChange={(event) =>
                updateConfirmedDamagedQuantity(Number(event.target.value))
              }
              className="w-full rounded border px-4 py-2"
            />
          </label>
        </div>

        <textarea
          value={managerComment}
          onChange={(event) => setManagerComment(event.target.value)}
          placeholder="Manager comment"
          className="mt-4 min-h-28 w-full rounded border px-4 py-2"
        />
        {isCommentRequired && (
          <p className="mt-2 text-sm text-red-600">
            Manager comment is required when there is a damaged item.
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded border px-4 py-2">
            Cancel
          </button>
          <button
            onClick={() =>
              onConfirm({
                confirmedGoodQuantity,
                confirmedDamagedQuantity,
                managerComment: managerComment.trim(),
              })
            }
            disabled={isInvalid}
            className="rounded bg-yellow-400 px-4 py-2 font-semibold text-black disabled:opacity-60"
          >
            Confirm Return
          </button>
        </div>
      </div>
    </div>
  )
}

function ActionCommentModal({
  title,
  message,
  confirmLabel,
  isCommentRequired,
  onClose,
  onConfirm,
}: {
  title: string
  message: string
  confirmLabel: string
  isCommentRequired?: boolean
  onClose: () => void
  onConfirm: (comment: string) => void
}) {
  const [comment, setComment] = useState("")
  const isDisabled = Boolean(isCommentRequired && !comment.trim())

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-2xl font-bold">{title}</h3>
        <p className="mt-2 text-gray-600">{message}</p>

        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Manager comment"
          className="mt-5 min-h-32 w-full rounded border px-4 py-2"
        />
        {isCommentRequired && !comment.trim() && (
          <p className="mt-2 text-sm text-red-600">Comment is required.</p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded border px-4 py-2">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(comment.trim())}
            disabled={isDisabled}
            className="rounded bg-yellow-400 px-4 py-2 font-semibold text-black disabled:opacity-60"
          >
            {confirmLabel}
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
      : status === "Damaged"
        ? "bg-red-100 text-red-800"
        : status === "Rejected" || status === "Cancelled"
          ? "bg-gray-200 text-gray-700"
          : status === "Return Pending"
            ? "bg-purple-100 text-purple-800"
            : status === "Reserved"
              ? "bg-orange-100 text-orange-800"
              : status === "Returned" || status === "Approved"
                ? "bg-green-100 text-green-800"
                : "bg-blue-100 text-blue-800"

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${classes}`}>
      {status === "Damaged" && <CircleAlert className="h-4 w-4" />}
      {status}
    </span>
  )
}

function PartStatusBadge({ status }: { status: string }) {
  const classes =
    status === "Available"
      ? "bg-green-100 text-green-800"
      : status === "Low Stock"
        ? "bg-orange-100 text-orange-800"
        : status === "Not Available"
          ? "bg-red-100 text-red-800"
          : status === "Reserved"
            ? "bg-yellow-100 text-yellow-800"
            : status === "Borrowed"
              ? "bg-blue-100 text-blue-800"
              : status === "Damaged"
                ? "bg-gray-200 text-gray-800"
                : "bg-gray-100 text-gray-800"

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${classes}`}>
      {status}
    </span>
  )
}

function getDisplayPartStatus(part: Part, lowStockThreshold: number) {
  if (part.totalQuantity === 0 || part.availableQuantity === 0) {
    return "Not Available"
  }

  if (part.availableQuantity <= lowStockThreshold && part.availableQuantity > 0) {
    return "Low Stock"
  }

  return "Available"
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
    part
      ? {
        ...part,
        totalQuantity: part.totalQuantity ?? part.quantity ?? 0,
        availableQuantity: part.availableQuantity ?? part.quantity ?? 0,
        reservedQuantity: part.reservedQuantity ?? 0,
        borrowedQuantity: part.borrowedQuantity ?? 0,
        damagedQuantity: part.damagedQuantity ?? 0,
        stockAllocationNote: part.stockAllocationNote || "",
      }
      : {
        id: Date.now(),
        name: "",
        category: partCategories[0],
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
        status: "Available",
      }
  )
  const allocationTotal =
    form.availableQuantity +
    form.reservedQuantity +
    form.borrowedQuantity +
    form.damagedQuantity
  const originalDamagedQuantity = part?.damagedQuantity ?? 0
  const hasInvalidQuantity =
    [
      form.availableQuantity,
      form.damagedQuantity,
    ].some((quantity) => quantity < 0) || allocationTotal < 0
  const needsAllocationNote = form.damagedQuantity !== originalDamagedQuantity
  const hasMissingAllocationNote =
    needsAllocationNote && !form.stockAllocationNote.trim()

  function updateField(field: keyof Part, value: string | number) {
    setForm({ ...form, [field]: value })
  }

  function updateStockField(
    field:
      | "availableQuantity"
      | "damagedQuantity",
    value: number
  ) {
    if (field === "availableQuantity") {
      const totalQuantity =
        value +
        form.reservedQuantity +
        form.borrowedQuantity +
        form.damagedQuantity
      setForm({
        ...form,
        availableQuantity: value,
        totalQuantity,
        quantity: value,
      })
      return
    }

    const damagedDelta = value - form.damagedQuantity
    const nextAvailableQuantity = form.availableQuantity - damagedDelta

    setForm({
      ...form,
      availableQuantity: nextAvailableQuantity,
      damagedQuantity: value,
      totalQuantity:
        nextAvailableQuantity +
        form.reservedQuantity +
        form.borrowedQuantity +
        value,
      quantity: nextAvailableQuantity,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto bg-white rounded-lg shadow-lg p-6">
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
            placeholder="Manufacturer (e.g. Espressif Systems)"
            value={form.manufacturer}
            onChange={(e) => updateField("manufacturer", e.target.value)}
            className="w-full border rounded px-4 py-2"
          />

          <input
            placeholder="Reference"
            value={form.reference}
            onChange={(e) => updateField("reference", e.target.value)}
            className="w-full border rounded px-4 py-2"
          />

          <div className="rounded border border-gray-200 p-4">
            <p className="mb-3 font-semibold">Stock management</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm text-gray-600">
                Total stock
                <input
                  type="number"
                  value={allocationTotal}
                  readOnly
                  className="mt-1 w-full border rounded px-4 py-2 bg-gray-100"
                />
              </label>
              <label className="text-sm text-gray-600">
                Available stock
                <input
                  type="number"
                  min={0}
                  placeholder="Available stock"
                  value={form.availableQuantity}
                  onChange={(e) =>
                    updateStockField("availableQuantity", Number(e.target.value))
                  }
                  className="mt-1 w-full border rounded px-4 py-2"
                />
              </label>
              <label className="text-sm text-gray-600">
                Reserved
                <input
                  type="number"
                  value={form.reservedQuantity}
                  readOnly
                  className="mt-1 w-full border rounded px-4 py-2 bg-gray-100"
                />
              </label>
              <label className="text-sm text-gray-600">
                Borrowed
                <input
                  type="number"
                  value={form.borrowedQuantity}
                  readOnly
                  className="mt-1 w-full border rounded px-4 py-2 bg-gray-100"
                />
              </label>
              <label className="text-sm text-gray-600">
                Damaged stock
                <input
                  type="number"
                  min={0}
                  placeholder="Damaged stock"
                  value={form.damagedQuantity}
                  onChange={(e) =>
                    updateStockField("damagedQuantity", Number(e.target.value))
                  }
                  className="mt-1 w-full border rounded px-4 py-2"
                />
              </label>
            </div>
            {hasInvalidQuantity && (
              <p className="mt-2 text-sm text-red-600">
                Available and damaged stock must be non-negative.
              </p>
            )}
          </div>

          <input
            placeholder="Location"
            value={form.location}
            onChange={(e) => updateField("location", e.target.value)}
            className="w-full border rounded px-4 py-2"
          />

          <textarea
            placeholder="Brief description of this component and its use case..."
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            className="w-full border rounded px-4 py-2 min-h-24"
          />

          <textarea
            placeholder="Damage, repair, or restock note"
            value={form.stockAllocationNote}
            onChange={(e) => updateField("stockAllocationNote", e.target.value)}
            className="w-full border rounded px-4 py-2 min-h-20"
          />
          {hasMissingAllocationNote && (
            <p className="text-sm text-red-600">
              Allocation note is required when reserved, borrowed, or damaged
              quantity is greater than 0.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 border rounded">
            Cancel
          </button>

          <button
            onClick={() => onSave(form)}
            className="px-4 py-2 bg-yellow-400 text-black font-semibold rounded"
            disabled={
              !form.name ||
              !form.category ||
              !form.reference ||
              hasInvalidQuantity ||
              hasMissingAllocationNote
            }
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

function IconButton({
  icon,
  label,
  onClick,
  tone = "neutral",
  disabled = false,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  tone?: "blue" | "red" | "green" | "yellow" | "neutral" | "purple"
  disabled?: boolean
}) {
  const tones = {
    blue: "border-blue-200 text-blue-700 hover:bg-blue-50",
    red: "border-red-200 text-red-700 hover:bg-red-50",
    green: "border-green-200 text-green-700 hover:bg-green-50",
    yellow: "border-yellow-300 bg-yellow-50 text-yellow-800 hover:bg-yellow-100",
    neutral: "border-gray-300 text-gray-700 hover:bg-gray-100",
    purple: "border-purple-200 text-purple-700 hover:bg-purple-50",
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition disabled:cursor-not-allowed disabled:opacity-40 ${tones[tone]}`}
    >
      {icon}
    </button>
  )
}

function Pagination({
  page,
  totalPages,
  start,
  end,
  total,
  onPageChange,
}: {
  page: number
  totalPages: number
  start: number
  end: number
  total: number
  onPageChange: (page: number) => void
}) {
  if (total <= PAGE_SIZE) {
    return null
  }

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
      <span>
        Showing {start}-{end} of {total}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded border px-3 py-1.5 font-medium disabled:opacity-40"
        >
          Previous
        </button>
        <span className="min-w-24 text-center">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="rounded border px-3 py-1.5 font-medium disabled:opacity-40"
        >
          Next
        </button>
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
  chartId,
  children,
}: {
  title: string
  chartId?: string
  children: React.ReactNode
}) {
  return (
    <div id={chartId} className="bg-white rounded-lg shadow p-6">
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
