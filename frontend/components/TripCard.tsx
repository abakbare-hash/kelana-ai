"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface Trip {
  id: number
  destination: string
  days: number
  budget: number
  category: string
  daily_budget: number
  transportation: string
}

function categoryColor(category: string) {
  switch (category.toLowerCase()) {
    case "luxury":     return "text-orange-500"
    case "backpacker": return "text-purple-500"
    default:           return "text-blue-500"
  }
}

export default function TripCard({ trip, onDeleted }: { trip: Trip; onDeleted?: (id: number) => void }) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      const stored = localStorage.getItem("user")
      const user = stored ? JSON.parse(stored) : null
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

        {/* Info */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Destination + Category on same row */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-green-600 text-xl sm:text-2xl truncate">{trip.destination}</span>
            <span className={`font-bold text-xs whitespace-nowrap ${categoryColor(trip.category)}`}>
              {trip.category}
            </span>
          </div>
          {/* Days + Budget below */}
          <div className="flex gap-3 text-xs text-gray-500 mt-0.5">
            <span>{trip.days} Days</span>
            <span>USD {trip.budget}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => router.push(`/trip/${trip.id}`)}
            className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-semibold rounded-lg border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white active:scale-95 transition-all duration-150"
          >
            View Detail
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
    </>
  )
}
