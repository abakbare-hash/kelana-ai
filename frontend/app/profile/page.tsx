"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/TopBar";
import { API_URL } from "@/lib/api";

interface User {
  id: number;
  name: string;
  email: string;
  token: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [tripCount, setTripCount] = useState<number | null>(null);

  function handleLogout() {
    localStorage.removeItem("user");
    router.push("/login");
  }

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      router.push("/login");
      return;
    }
    const u: User = JSON.parse(stored);
    setUser(u);

    fetch(`${API_URL}/trips`, {
      headers: { Authorization: `Bearer ${u.token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setTripCount(Array.isArray(data) ? data.length : 0))
      .catch(() => setTripCount(0));
  }, [router]);

  if (!user) return null;

  return (
    <main className="min-h-screen bg-gray-50 py-8 sm:py-12 px-4">
      <TopBar />
      <div className="max-w-md mx-auto w-full">

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-green-600 mb-1">My Profile</h1>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow p-6 space-y-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800">{user.name}</h2>
          </div>

          {/* Info */}
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Name</p>
              <p className="font-semibold text-gray-800 mt-0.5">{user.name}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Email</p>
              <p className="font-semibold text-gray-800 mt-0.5">{user.email}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Total Trips Generated</p>
              <p className="font-semibold text-gray-800 mt-0.5">
                {tripCount === null ? "..." : tripCount}
              </p>
            </div>
          </div>

          {/* Change password */}
          <button
            onClick={() => setShowModal(true)}
            className="w-full py-2.5 text-sm font-semibold rounded-lg border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white active:scale-95 transition-all duration-150"
          >
            Change Password
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full py-2.5 text-sm font-semibold rounded-lg border-2 border-red-400 text-red-500 hover:bg-red-400 hover:text-white active:scale-95 transition-all duration-150"
          >
            Logout
          </button>
        </div>

        {/* Back button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push("/")}
            className="text-sm font-semibold text-green-600 hover:text-green-700 transition"
          >
            ← Back to Home
          </button>
        </div>
      </div>

      {showModal && (
        <ChangePasswordModal token={user.token} onClose={() => setShowModal(false)} />
      )}
    </main>
  );
}

function ChangePasswordModal({ token, onClose }: { token: string; onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ current_password: current, new_password: next }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Something went wrong");

      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">Change Password</h3>

        {success ? (
          <div className="text-center space-y-4">
            <p className="text-sm text-green-600 font-medium">Password changed successfully!</p>
            <button
              onClick={onClose}
              className="w-full py-2.5 text-sm font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 transition"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Current Password</label>
              <input
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                required
                minLength={8}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className={`text-xs mt-1 ${
                next.length === 0 ? "text-gray-400" : next.length < 8 ? "text-red-500" : "text-green-600"
              }`}>
                Password must be at least 8 characters.
              </p>
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
        )}
      </div>
    </div>
  );
}
