import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react"
import { getAuthEndpoint } from "./authApi"
import type { AuthResponse } from "./authTypes"
import type { CollaboratorGroup, Division } from "../../shared/types/organization"

const divisions: Division[] = ["Division 1", "Division 2", "Division 3", "Division 4", "Admin"]
const collaboratorGroups: CollaboratorGroup[] = ["Group 1", "Group 2", "Group 3", "Group 4"]
export function LoginPage({
  authError,
  onLogin,
  setAuthError,
}: {
  authError: string
  onLogin: (authResponse: AuthResponse) => void
  setAuthError: Dispatch<SetStateAction<string>>
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
        getAuthEndpoint(mode === "login" ? "login" : "register"),
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

