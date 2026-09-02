"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TripCard from "@/components/TripCard";

interface Trip {
  id: number;
  destination: string;
  days: number;
  budget: number;
  category: string;
  daily_budget: number;
  transportation: string;
}

// ─── Create Trip Tab ──────────────────────────────────────────────────────────

function CreateTripTab() {
  const router = useRouter();
  const [destination, setDestination] = useState("");
  const [days, setDays] = useState("");
  const [budget, setBudget] = useState("");
  const [travelStyle, setTravelStyle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const stored = localStorage.getItem("user");
      const user = stored ? JSON.parse(stored) : null;

      const response = await fetch("http://localhost:8000/api/v1/trips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({
          destination,
          days: parseInt(days),
          budget: parseFloat(budget),
          travel_style: travelStyle,
        }),
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const data = await response.json();
      router.push(`/trip/${data.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-4 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Destination</label>
            <input
              type="text"
              placeholder="e.g. Bali, Japan, Paris"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Number of Days</label>
            <input
              type="number"
              placeholder="e.g. 5"
              min={1}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Budget (USD)</label>
            <input
              type="number"
              placeholder="e.g. 2000"
              min={0}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Travel Style</label>
            <input
              type="text"
              placeholder="e.g. Backpacker, Family, Luxury, Adventure"
              value={travelStyle}
              onChange={(e) => setTravelStyle(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-green-700 transition disabled:opacity-50"
        >
          {loading ? "Planning your trip..." : "Plan My Trip"}
        </button>
      </form>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="mt-6 flex flex-col items-center gap-3 text-gray-500">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-gray-600">Generating itinerary...</p>
          <p className="text-xs text-gray-400">Please wait while Amazon Nova Lite does its best for you ✨</p>
        </div>
      )}
    </div>
  );
}

// ─── Trips List Tab ───────────────────────────────────────────────────────────

function TripsTab() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"latest" | "oldest" | "budget">("latest");
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    const user = stored ? JSON.parse(stored) : null;

    fetch("http://localhost:8000/api/v1/trips", {
      headers: { Authorization: `Bearer ${user?.token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        return res.json();
      })
      .then((data) => setTrips(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = trips
    .filter((t) =>
      t.destination.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sort === "latest")  return b.id - a.id;
      if (sort === "oldest")  return a.id - b.id;
      if (sort === "budget")  return b.budget - a.budget;
      return 0;
    });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * perPage;
  const paginated = filtered.slice(startIdx, startIdx + perPage);

  // Reset to page 1 whenever search, sort, or perPage changes
  useEffect(() => {
    setPage(1);
  }, [search, sort, perPage]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
        {error}
      </div>
    );
  }

  return (
    <div>
      {/* Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          placeholder="Search trips..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "latest" | "oldest" | "budget")}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-gray-700"
        >
          <option value="latest">Latest</option>
          <option value="oldest">Oldest</option>
          <option value="budget">Highest Budget</option>
        </select>
      </div>

      {/* Trip List */}
      {/* Empty state — no trips in DB */}
      {trips.length === 0 ? (
        <div className="bg-white rounded-2xl shadow border border-gray-100 p-8 flex flex-col items-center gap-4 text-center">
          <div className="text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7h18M3 12h18M3 17h18" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-gray-700">No trips saved yet</h3>
          <p className="text-sm text-gray-400">Start planning your first trip and it will appear here.</p>
          <button
            onClick={() => router.push("/?tab=create")}
            className="mt-2 px-6 py-2 text-sm font-semibold rounded-lg border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white active:scale-95 transition-all duration-150"
          >
            Generate a Trip
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          No trips match your search.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3">
            {(filtered.length > 10 ? paginated : filtered).map((t) => (
              <TripCard
                key={t.id}
                trip={t}
                onDeleted={(id) => setTrips((prev) => prev.filter((t) => t.id !== id))}
                onUpdated={(updated) => setTrips((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)))}
              />
            ))}
          </div>

          {/* Pagination controls — only when more than 10 trips */}
          {filtered.length > 10 && (
          <div className="flex items-center justify-between mt-5">
            <span className="text-xs text-gray-400">
              Showing {startIdx + 1}–{Math.min(startIdx + perPage, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-2">
              <select
                value={perPage}
                onChange={(e) => setPerPage(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-gray-700"
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
              </select>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-green-600"
              >
                Prev
              </button>
              <span className="text-xs font-semibold text-gray-600">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-green-600"
              >
                Next
              </button>
            </div>
          </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"create" | "trips">(
    searchParams.get("tab") === "trips" ? "trips" : "create"
  );
  const [user, setUser] = useState<{ id: number; name: string; email: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(stored));
  }, [router]);

  useEffect(() => {
    setActiveTab(searchParams.get("tab") === "trips" ? "trips" : "create");
  }, [searchParams]);

  function handleLogout() {
    localStorage.removeItem("user");
    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8 sm:py-12 px-4">
      <div className="max-w-2xl mx-auto w-full">

        {/* Top bar: greeting + profile + logout */}
        {user && (
          <div className="flex justify-between items-center mb-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Hi, <span className="font-semibold text-gray-700">{user.name}</span></span>
              <button
                onClick={() => router.push("/ask")}
                className="text-xs font-semibold text-green-600 border border-green-600 rounded-lg px-3 py-1 hover:bg-green-600 hover:text-white active:scale-95 transition-all duration-150"
              >
                Ask KelanaAI
              </button>
              <button
                onClick={() => router.push("/chat")}
                className="text-xs font-semibold text-green-600 border border-green-600 rounded-lg px-3 py-1 hover:bg-green-600 hover:text-white active:scale-95 transition-all duration-150"
              >
                Chat
              </button>
              <button
                onClick={() => router.push("/profile")}
                aria-label="My Profile"
                title="My Profile"
                className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center hover:bg-green-600 hover:text-white transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs font-semibold text-green-600 hover:text-green-700 border border-green-600 rounded-lg px-3 py-1 hover:bg-green-50 transition"
            >
              Logout
            </button>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-green-600 mb-2">KelanaAI</h1>
          <p className="text-gray-500 text-sm">Your AI-powered travel planner</p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl overflow-hidden border border-gray-200 mb-8 bg-white shadow-sm">
          <button
            onClick={() => setActiveTab("create")}
            className={`flex-1 py-2 text-xs font-semibold transition ${
              activeTab === "create"
                ? "bg-green-600 text-white"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            Generate Trip
          </button>
          <button
            onClick={() => setActiveTab("trips")}
            className={`flex-1 py-2 text-xs font-semibold transition ${
              activeTab === "trips"
                ? "bg-green-600 text-white"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            My Trips
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "create" ? <CreateTripTab /> : <TripsTab />}

      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div />}>
      <HomeContent />
    </Suspense>
  );
}
