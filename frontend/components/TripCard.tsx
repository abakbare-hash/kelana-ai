"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface Trip {
  id: number
  user_id?: number | null
  destination: string
  days: number
  budget: number
  category: string
  daily_budget: number
  transportation: string
  travel_style?: string | null
  country_code?: string | null
}

function getStoredUser(): { id: number; token: string } | null {
  const stored = typeof window !== "undefined" ? localStorage.getItem("user") : null
  return stored ? JSON.parse(stored) : null
}

function categoryColor(category: string) {
  switch (category.toLowerCase()) {
    case "luxury":     return "text-orange-500"
    case "backpacker": return "text-purple-500"
    default:           return "text-blue-500"
  }
}

// Build a flag image URL from an ISO 3166-1 alpha-2 code using flagcdn.com
// (free, no API key). Flag emojis don't render on Windows, so we use images.
function flagUrl(code?: string | null): string | null {
  if (!code || code.length !== 2) return null
  return `https://flagcdn.com/w80/${code.toLowerCase()}.png`
}

// Consistent color per travel style (same style always gets same badge color)
const BADGE_COLORS = [
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
  "bg-lime-100 text-lime-700",
  "bg-emerald-100 text-emerald-700",
  "bg-cyan-100 text-cyan-700",
  "bg-indigo-100 text-indigo-700",
  "bg-fuchsia-100 text-fuchsia-700",
  "bg-teal-100 text-teal-700",
]

function styleBadgeColor(style: string): string {
  let hash = 0
  for (let i = 0; i < style.length; i++) {
    hash = style.charCodeAt(i) + ((hash << 5) - hash)
  }
  return BADGE_COLORS[Math.abs(hash) % BADGE_COLORS.length]
}

export default function TripCard({
  trip,
  onDeleted,
  onUpdated,
}: {
  trip: Trip
  onDeleted?: (id: number) => void
  onUpdated?: (updated: Trip) => void
}) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const currentUser = getStoredUser()
  // Only the owner (matching logged-in user) may act on this trip.
  const isOwner =
    !!currentUser &&
    (trip.user_id == null || trip.user_id === currentUser.id)

  async function handleDelete() {
    setDeleting(true)
    try {
      const user = getStoredUser()
      await fetch(`http://localhost:8000/api/v1/trips/${trip.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${user?.token}` },
      })
      setShowConfirm(false)
      onDeleted?.(trip.id)
    } catch {
      setDeleting(false)
    }
  }

  return (
    <>
      {/* Card */}
      <div className="bg-white rounded-lg shadow border border-transparent hover:border-green-400 hover:bg-green-50 transition-all duration-150 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">

        {/* Flag icon */}
        <div className="shrink-0 flex items-center justify-center w-11 h-8 sm:w-12 sm:h-9 rounded overflow-hidden bg-gray-100">
          {flagUrl(trip.country_code) ? (
            <img
              src={flagUrl(trip.country_code)!}
              alt={`${trip.destination} flag`}
              className="w-full h-full object-cover"
              onError={(e) => {
                const el = e.target as HTMLImageElement
                el.style.display = "none"
                el.parentElement!.textContent = "🌍"
              }}
            />
          ) : (
            <span className="text-xl">🌍</span>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Destination + Category on same row */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-green-600 text-xl sm:text-2xl truncate">{trip.destination}</span>
            <span className={`font-bold text-xs whitespace-nowrap ${categoryColor(trip.category)}`}>
              {trip.category}
            </span>
          </div>
          {/* Travel style badge + Days + Budget below */}
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
            {trip.travel_style && (
              <span className={`px-2 py-0.5 rounded-full font-semibold ${styleBadgeColor(trip.travel_style)}`}>
                {trip.travel_style}
              </span>
            )}
            <span>{trip.days} Days</span>
            <span>USD {trip.budget}</span>
          </div>
        </div>

        {/* Buttons — only shown to the trip owner */}
        {isOwner && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => router.push(`/trip/${trip.id}`)}
              className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-semibold rounded-lg border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white active:scale-95 transition-all duration-150"
            >
              View Detail
            </button>
            <button
              onClick={() => setShowEdit(true)}
              className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-semibold rounded-lg border-2 border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-white active:scale-95 transition-all duration-150 flex items-center justify-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              Update
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-semibold rounded-lg border-2 border-red-400 text-red-400 hover:bg-red-400 hover:text-white active:scale-95 transition-all duration-150 flex items-center justify-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" d="M9 3a1 1 0 00-1 1v1H5a1 1 0 000 2h1v11a2 2 0 002 2h8a2 2 0 002-2V7h1a1 1 0 100-2h-3V4a1 1 0 00-1-1H9zm0 2h6v1H9V5zm-1 3h8v10H8V8zm2 2a1 1 0 012 0v5a1 1 0 11-2 0v-5zm4 0a1 1 0 012 0v5a1 1 0 11-2 0v-5z" clipRule="evenodd" />
              </svg>
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Confirm Popup */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-80 text-center">
            <div className="flex justify-center mb-3 text-red-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" d="M9 3a1 1 0 00-1 1v1H5a1 1 0 000 2h1v11a2 2 0 002 2h8a2 2 0 002-2V7h1a1 1 0 100-2h-3V4a1 1 0 00-1-1H9zm0 2h6v1H9V5zm-1 3h8v10H8V8zm2 2a1 1 0 012 0v5a1 1 0 11-2 0v-5zm4 0a1 1 0 012 0v5a1 1 0 11-2 0v-5z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-gray-800 mb-1">Delete Trip</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete <span className="font-semibold text-gray-700">{trip.destination}</span>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={deleting}
                className="flex-1 py-2 text-sm font-semibold rounded-lg border-2 border-gray-300 text-gray-600 hover:bg-gray-100 active:scale-95 transition-all duration-150"
              >
                No
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 text-sm font-semibold rounded-lg border-2 border-red-400 text-red-400 hover:bg-red-400 hover:text-white active:scale-95 transition-all duration-150 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Yes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Popup */}
      {showEdit && (
        <EditTripModal
          trip={trip}
          onClose={() => setShowEdit(false)}
          onUpdated={(updated) => {
            setShowEdit(false)
            onUpdated?.(updated)
          }}
        />
      )}
    </>
  )
}

function EditTripModal({
  trip,
  onClose,
  onUpdated,
}: {
  trip: Trip
  onClose: () => void
  onUpdated: (updated: Trip) => void
}) {
  const [budget, setBudget] = useState(String(trip.budget))
  const [days, setDays] = useState(String(trip.days))
  const [travelStyle, setTravelStyle] = useState(trip.travel_style ?? "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const user = getStoredUser()
      const res = await fetch(`http://localhost:8000/api/v1/trips/${trip.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({
          budget: parseFloat(budget),
          days: parseInt(days),
          travel_style: travelStyle,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Update failed")
      onUpdated(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <h3 className="text-base font-bold text-gray-800 mb-1 text-center">Update Trip</h3>
        <p className="text-xs text-gray-400 text-center mb-4">{trip.destination}</p>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Budget (USD)</label>
            <input
              type="number"
              min={0}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Number of Days</label>
            <input
              type="number"
              min={1}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Travel Style</label>
            <input
              type="text"
              placeholder="e.g. Family, Luxury, Adventure"
              value={travelStyle}
              onChange={(e) => setTravelStyle(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-xs">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2 text-sm font-semibold rounded-lg border-2 border-gray-300 text-gray-600 hover:bg-gray-100 active:scale-95 transition-all duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 text-sm font-semibold rounded-lg border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white active:scale-95 transition-all duration-150 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
