import { useEffect, useState } from "react"
import { CheckCircle, XCircle } from "lucide-react"
import type { ApiFetch } from "../../shared/api/apiClient"
import { endpoints } from "../../shared/api/endpoints"
import { BulkActionBar as BulkToolbar } from "../../shared/components/BulkActionBar"
import { ConfirmModal as BulkConfirmModal } from "../../shared/components/ConfirmModal"
import { IconButton } from "../../shared/components/IconButton"
import { Pagination } from "../../shared/components/Pagination"
import { SelectionCell, SelectionHeader } from "../../shared/components/TableSelection"
import { usePageSelection } from "../../shared/hooks/usePageSelection"
import { getPageItems } from "../../shared/hooks/usePagination"
import type { Division } from "../../shared/types/organization"
import { isHighlightTarget } from "../../shared/utils/navigation"
import type { UserRole } from "../../shared/utils/permissions"
import type { AuthUser } from "../auth/authTypes"
import type { AppSettings } from "./settingsTypes"

const USERS_API_URL = endpoints.users
const SETTINGS_API_URL = endpoints.settings
const divisions: Division[] = [
  "Division 1",
  "Division 2",
  "Division 3",
  "Division 4",
  "Admin",
]
export function SettingsPage({
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
  const [bulkVerificationAction, setBulkVerificationAction] = useState<
    "verify" | "reject" | null
  >(null)

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
  const verificationSelection = usePageSelection(
    paginatedPendingUsers.items,
    verificationPage
  )

  async function handleBulkVerification(verificationComment: string) {
    if (!bulkVerificationAction) {
      return
    }

    try {
      setUsersError(null)
      const responses = await Promise.all(
        [...verificationSelection.selectedIds].map((id) =>
          apiFetch(`${USERS_API_URL}/${id}/${bulkVerificationAction}`, {
            method: "PUT",
            ...(bulkVerificationAction === "reject"
              ? {
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ verificationComment }),
                }
              : {}),
          })
        )
      )
      if (responses.some((response) => !response.ok)) {
        throw new Error("Failed to update selected users")
      }
      await reloadUsers()
      await reloadNotificationSummary()
      verificationSelection.clear()
      setBulkVerificationAction(null)
    } catch {
      setUsersError("Failed to update selected users")
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
        <BulkToolbar count={verificationSelection.selectedCount}>
          <button
            onClick={() => setBulkVerificationAction("verify")}
            className="rounded bg-green-600 px-3 py-2 text-sm font-semibold text-white"
          >
            Verify selected
          </button>
          <button
            onClick={() => setBulkVerificationAction("reject")}
            className="rounded bg-red-600 px-3 py-2 text-sm font-semibold text-white"
          >
            Reject selected
          </button>
        </BulkToolbar>
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="border-b bg-gray-100">
              <SelectionHeader
                checked={verificationSelection.allSelected}
                onChange={verificationSelection.toggleAll}
              />
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
                className={`border-b hover:bg-gray-50 ${
                  verificationSelection.selectedIds.has(user.id)
                    ? "bg-yellow-50"
                    : ""
                } ${isHighlightTarget(
                  highlightTarget,
                  "Settings",
                  "UserVerification",
                  user.id
                )
                  ? "bg-yellow-100"
                  : ""
                  }`}
              >
                <SelectionCell
                  checked={verificationSelection.selectedIds.has(user.id)}
                  onChange={() => verificationSelection.toggle(user.id)}
                  label={`Select ${user.name}`}
                />
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
                <td colSpan={6} className="py-8 text-center text-gray-500">
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
      {bulkVerificationAction && (
        <BulkConfirmModal
          title={
            bulkVerificationAction === "verify"
              ? "Verify selected users"
              : "Reject selected users"
          }
          message={`${bulkVerificationAction === "verify" ? "Verify" : "Reject"} ${verificationSelection.selectedCount} selected users?`}
          confirmLabel={
            bulkVerificationAction === "verify"
              ? "Verify selected"
              : "Reject selected"
          }
          tone={bulkVerificationAction === "verify" ? "green" : "red"}
          commentLabel={
            bulkVerificationAction === "reject"
              ? "Shared rejection reason"
              : undefined
          }
          commentRequired={bulkVerificationAction === "reject"}
          onClose={() => setBulkVerificationAction(null)}
          onConfirm={handleBulkVerification}
        />
      )}
    </>
  )
}

