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
  collaborator: string
  partName: string
  quantity: number
  expectedReturnDate: string
  status: "Reserved" | "Borrowed" | "Returned"
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

const initialReservations: Reservation[] = [
  {
    id: 1,
    collaborator: "Ahmed B.",
    partName: "Raspberry Pi 4",
    quantity: 1,
    expectedReturnDate: "2026-06-10",
    status: "Borrowed",
  },
  {
    id: 2,
    collaborator: "Sara M.",
    partName: "Ultrasonic Sensor",
    quantity: 2,
    expectedReturnDate: "2026-06-07",
    status: "Reserved",
  },
]

const initialCollaborators: Collaborator[] = [
  {
    id: 1,
    name: "Ayman Douah",
    email: "ayman.douah@bertrandt.com",
    division: "Admin",
    group: "Group 1",
    role: "Inventory Manager",
  },
  {
    id: 2,
    name: "Ahmed B.",
    email: "ahmed.b@bertrandt.com",
    division: "Division 1",
    group: "Group 2",
    role: "Embedded Engineer",
  },
  {
    id: 3,
    name: "Sara M.",
    email: "sara.m@bertrandt.com",
    division: "Division 2",
    group: "Group 3",
    role: "Validation Engineer",
  },
  {
    id: 4,
    name: "Youssef A.",
    email: "youssef.a@bertrandt.com",
    division: "Division 3",
    group: "Group 4",
    role: "Hardware Technician",
  },
]

function App() {
  const [activePage, setActivePage] = useState("Dashboard")
  const [parts, setParts] = useState<Part[]>([])
  const [isLoadingParts, setIsLoadingParts] = useState(true)
  const [partsError, setPartsError] = useState<string | null>(null)
  const [reservations, setReservations] =
    useState<Reservation[]>(initialReservations)
  const [collaborators, setCollaborators] =
    useState<Collaborator[]>(initialCollaborators)

  async function loadParts() {
    try {
      setIsLoadingParts(true)
      setPartsError(null)

      const response = await fetch(PARTS_API_URL)

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

  useEffect(() => {
    loadParts()
  }, [])

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-black text-white px-6 py-3 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-yellow-400">
          Bertrandt Inventory System
        </h1>

        <img
          src="/logo.png"
          alt="Bertrandt"
          className="h-24 w-auto object-contain"
        />
      </header>

      <div className="flex">
        <aside className="w-64 min-h-screen bg-gray-900 text-white p-4">
          {["Dashboard", "Inventory", "Reservations", "Collaborators", "Analytics", "Settings"].map(
            (page) => (
              <button
                key={page}
                onClick={() => setActivePage(page)}
                className={`block w-full text-left px-3 py-3 rounded ${activePage === page
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
          {activePage === "Dashboard" && (
            <Dashboard
              parts={parts}
              reservations={reservations}
              collaborators={collaborators}
            />
          )}
          {activePage === "Inventory" && (
            <Inventory
              parts={parts}
              isLoadingParts={isLoadingParts}
              partsError={partsError}
              reloadParts={loadParts}
              setPartsError={setPartsError}
            />
          )}
          {activePage === "Reservations" && (
            <Reservations
              parts={parts}
              reservations={reservations}
              setReservations={setReservations}
            />
          )}
          {activePage === "Collaborators" && (
            <Collaborators
              collaborators={collaborators}
              reservations={reservations}
              setCollaborators={setCollaborators}
            />
          )}
          {activePage === "Analytics" && (
            <Analytics
              parts={parts}
              reservations={reservations}
              collaborators={collaborators}
            />
          )}
        </main>
      </div>
    </div>
  )
}

function getLowStockParts(parts: Part[]) {
  return parts.filter((part) => part.status === "Low Stock" || part.quantity <= 5)
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
}: {
  parts: Part[]
  reservations: Reservation[]
  collaborators: Collaborator[]
}) {
  const total = parts.length
  const available = parts.filter((p) => p.status === "Available").length
  const borrowed = parts.filter((p) => p.status === "Borrowed").length
  const lowStock = parts.filter((p) => p.status === "Low Stock").length
  const borrowedReservations = reservations.filter(
    (reservation) => reservation.status === "Borrowed"
  ).length
  const reservedReservations = reservations.filter(
    (reservation) => reservation.status === "Reserved"
  ).length
  const activeBorrowers = getActiveBorrowers(collaborators, reservations)
  const topBorrowedPart = getBorrowedPartRanking(reservations)[0]
  const mostActiveCollaborator = getMostActiveCollaborator(
    collaborators,
    reservations
  )
  const lowStockAlertCounter = getLowStockParts(parts).length

  return (
    <>
      <h2 className="text-3xl font-bold mb-8">Dashboard Overview</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard label="Total Parts" value={String(total)} />
        <StatCard label="Available" value={String(available)} color="text-green-600" />
        <StatCard label="Borrowed" value={String(borrowed)} color="text-blue-600" />
        <StatCard label="Low Stock" value={String(lowStock)} color="text-red-600" />
        <StatCard
          label="Borrowed Reservations"
          value={String(borrowedReservations)}
          color="text-blue-600"
        />
        <StatCard
          label="Reserved Reservations"
          value={String(reservedReservations)}
          color="text-yellow-600"
        />
        <StatCard
          label="Total Collaborators"
          value={String(collaborators.length)}
        />
        <StatCard
          label="Active Borrowers"
          value={String(activeBorrowers)}
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
              {mostActiveCollaborator?.name || "No collaborator activity"}
            </h4>
            <p className="text-sm text-gray-500">
              {mostActiveCollaborator?.totalReservations || 0} reservations
            </p>
          </div>

          <div className="border border-gray-200 rounded p-4">
            <p className="text-gray-500">Low Stock Alerts</p>
            <h4 className="text-lg font-bold text-red-600">
              {lowStockAlertCounter}
            </h4>
            <p className="text-sm text-gray-500">parts need attention</p>
          </div>
        </div>
      </div>
    </>
  )
}

function Analytics({
  parts,
  reservations,
  collaborators,
}: {
  parts: Part[]
  reservations: Reservation[]
  collaborators: Collaborator[]
}) {
  const availableParts = parts.filter((part) => part.status === "Available").length
  const borrowedParts = parts.filter((part) => part.status === "Borrowed").length
  const reservedParts = reservations.filter(
    (reservation) => reservation.status === "Reserved"
  ).length
  const lowStockParts = getLowStockParts(parts)
  const activeBorrowers = getActiveBorrowers(collaborators, reservations)
  const borrowedPartRanking = getBorrowedPartRanking(reservations).slice(0, 10)
  const activeCollaboratorRanking = collaborators
    .map((collaborator) => ({
      name: collaborator.name,
      ...getCollaboratorStats(collaborator, reservations),
    }))
    .sort((a, b) => b.totalReservations - a.totalReservations)
    .slice(0, 10)

  const inventoryByCategory = Object.entries(
    parts.reduce<Record<string, number>>((categories, part) => {
      categories[part.category] = (categories[part.category] || 0) + 1
      return categories
    }, {})
  ).map(([name, value]) => ({ name, value }))

  const divisionAnalytics = divisions.map((division) => {
    const divisionCollaborators = collaborators.filter(
      (collaborator) => collaborator.division === division
    )
    const collaboratorNames = divisionCollaborators.map(
      (collaborator) => collaborator.name
    )
    const divisionReservations = reservations.filter((reservation) =>
      collaboratorNames.includes(reservation.collaborator)
    )

    return {
      division,
      collaborators: divisionCollaborators.length,
      activeReservations: divisionReservations.filter(
        (reservation) => reservation.status !== "Returned"
      ).length,
      borrowedParts: divisionReservations.filter(
        (reservation) => reservation.status === "Borrowed"
      ).length,
    }
  })

  const groupAnalytics = collaboratorGroups.map((group) => {
    const groupCollaborators = collaborators.filter(
      (collaborator) => collaborator.group === group
    )
    const collaboratorNames = groupCollaborators.map(
      (collaborator) => collaborator.name
    )
    const groupReservations = reservations.filter((reservation) =>
      collaboratorNames.includes(reservation.collaborator)
    )

    return {
      group,
      collaborators: groupCollaborators.length,
      activeReservations: groupReservations.filter(
        (reservation) => reservation.status !== "Returned"
      ).length,
      borrowedParts: groupReservations.filter(
        (reservation) => reservation.status === "Borrowed"
      ).length,
    }
  })

  return (
    <>
      <h2 className="text-3xl font-bold mb-8">Analytics</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <StatCard label="Total Parts" value={String(parts.length)} />
        <StatCard
          label="Available Parts"
          value={String(availableParts)}
          color="text-green-600"
        />
        <StatCard
          label="Borrowed Parts"
          value={String(borrowedParts)}
          color="text-blue-600"
        />
        <StatCard
          label="Reserved Parts"
          value={String(reservedParts)}
          color="text-yellow-600"
        />
        <StatCard
          label="Total Collaborators"
          value={String(collaborators.length)}
        />
        <StatCard
          label="Active Borrowers"
          value={String(activeBorrowers)}
          color="text-blue-600"
        />
        <StatCard
          label="Low Stock Parts"
          value={String(lowStockParts.length)}
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
              <Bar dataKey="activeReservations" fill="#facc15" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Borrowed Parts by Group">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={groupAnalytics}>
              <XAxis dataKey="group" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="borrowedParts" fill="#2563eb" />
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
              {lowStockParts.map((part) => (
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
              {borrowedPartRanking.map((part, index) => (
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
              {activeCollaboratorRanking.map((collaborator, index) => (
                <tr key={collaborator.name} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-2">{index + 1}</td>
                  <td className="py-3 px-2 font-medium">{collaborator.name}</td>
                  <td className="py-3 px-2">
                    {collaborator.totalReservations}
                  </td>
                  <td className="py-3 px-2">{collaborator.borrowedItems}</td>
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
  reloadParts,
  setPartsError,
}: {
  parts: Part[]
  isLoadingParts: boolean
  partsError: string | null
  reloadParts: () => Promise<void>
  setPartsError: React.Dispatch<React.SetStateAction<string | null>>
}) {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("All Categories")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPart, setEditingPart] = useState<Part | null>(null)

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

      const response = await fetch(`${PARTS_API_URL}/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete part")
      }

      await reloadParts()
    } catch {
      setPartsError("Failed to delete part")
    }
  }

  async function handleSave(part: Part) {
    const { id, ...partPayload } = part

    try {
      setPartsError(null)

      const response = await fetch(
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
      setIsModalOpen(false)
      setEditingPart(null)
    } catch {
      setPartsError(editingPart ? "Failed to update part" : "Failed to create part")
    }
  }

  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold">Inventory</h2>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-yellow-400 text-black font-semibold px-4 py-2 rounded"
        >
          + Add Part
        </button>
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
            <option>Microcontroller</option>
            <option>Sensor</option>
            <option>Development Board</option>
            <option>PCB</option>
            <option>Actuator</option>
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
              <th className="text-left py-3 px-2">Actions</th>
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
                <td className="py-3 px-2 space-x-2">
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
                </td>
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
    </>
  )
}

function Collaborators({
  collaborators,
  reservations,
  setCollaborators,
}: {
  collaborators: Collaborator[]
  reservations: Reservation[]
  setCollaborators: React.Dispatch<React.SetStateAction<Collaborator[]>>
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

  function handleDelete(id: number) {
    setCollaborators(
      collaborators.filter((collaborator) => collaborator.id !== id)
    )
  }

  function handleSave(collaborator: Collaborator) {
    if (editingCollaborator) {
      setCollaborators(
        collaborators.map((currentCollaborator) =>
          currentCollaborator.id === collaborator.id
            ? collaborator
            : currentCollaborator
        )
      )
    } else {
      setCollaborators([
        ...collaborators,
        {
          ...collaborator,
          id: Date.now(),
        },
      ])
    }

    setIsModalOpen(false)
    setEditingCollaborator(null)
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <h2 className="text-3xl font-bold">Collaborators</h2>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-yellow-400 text-black font-semibold px-4 py-2 rounded"
        >
          + Add Collaborator
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6 overflow-x-auto">
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
              <th className="text-left py-3 px-2">Actions</th>
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
                </tr>
              )
            })}

            {filteredCollaborators.length === 0 && (
              <tr>
                <td
                  colSpan={8}
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

function Reservations({
  parts,
  reservations,
  setReservations,
}: {
  parts: Part[]
  reservations: Reservation[]
  setReservations: React.Dispatch<React.SetStateAction<Reservation[]>>
}) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  function handleCreate(reservation: Reservation) {
    setReservations([...reservations, { ...reservation, id: Date.now() }])
    setIsModalOpen(false)
  }

  function handleDelete(id: number) {
    setReservations(
      reservations.filter((reservation) => reservation.id !== id)
    )
  }

  function updateStatus(
    id: number,
    status: Reservation["status"]
  ) {
    setReservations(
      reservations.map((reservation) =>
        reservation.id === id ? { ...reservation, status } : reservation
      )
    )
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <h2 className="text-3xl font-bold">Reservations</h2>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-yellow-400 text-black font-semibold px-4 py-2 rounded"
        >
          + New Reservation
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6 overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead>
            <tr className="border-b bg-gray-100">
              <th className="text-left py-3 px-2">Collaborator</th>
              <th className="text-left py-3 px-2">Part</th>
              <th className="text-left py-3 px-2">Qty</th>
              <th className="text-left py-3 px-2">Expected Return</th>
              <th className="text-left py-3 px-2">Status</th>
              <th className="text-left py-3 px-2">Actions</th>
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
                <td className="py-3 px-2">
                  <div className="flex flex-wrap gap-2">
                    {reservation.status === "Reserved" && (
                      <button
                        onClick={() =>
                          updateStatus(reservation.id, "Borrowed")
                        }
                        className="text-blue-600"
                      >
                        Mark Borrowed
                      </button>
                    )}

                    {reservation.status === "Borrowed" && (
                      <button
                        onClick={() =>
                          updateStatus(reservation.id, "Returned")
                        }
                        className="text-green-600"
                      >
                        Return
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(reservation.id)}
                      className="text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {reservations.length === 0 && (
              <tr>
                <td
                  colSpan={6}
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
          onClose={() => setIsModalOpen(false)}
          onSave={handleCreate}
        />
      )}
    </>
  )
}

function ReservationModal({
  parts,
  onClose,
  onSave,
}: {
  parts: Part[]
  onClose: () => void
  onSave: (reservation: Reservation) => void
}) {
  const [form, setForm] = useState<Reservation>({
    id: Date.now(),
    collaborator: "",
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
          <input
            placeholder="Collaborator name"
            value={form.collaborator}
            onChange={(e) => updateField("collaborator", e.target.value)}
            className="w-full border rounded px-4 py-2"
          />

          <select
            value={form.partName}
            onChange={(e) => updateField("partName", e.target.value)}
            className="w-full border rounded px-4 py-2"
          >
            {parts.map((part) => (
              <option key={part.id} value={part.name}>
                {part.name}
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
            disabled={!form.collaborator || !form.partName}
          >
            Save
          </button>
        </div>
      </div>
    </div>
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
      category: "Microcontroller",
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
            <option>Microcontroller</option>
            <option>Sensor</option>
            <option>Development Board</option>
            <option>PCB</option>
            <option>Actuator</option>
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
