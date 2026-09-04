"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import TopBar from "@/components/TopBar";

interface TripResult {
  id: number;
  destination: string;
  days: number;
  budget: number;
  category: string;
  daily_budget: number;
  transportation: string;
  ai_recommendation: string;
  hero_image: string | null;
}

const LOADING_MESSAGES = [
  "Generating itinerary...",
  "Please wait while KelanaAI does its best for you ✨",
  "Researching the best spots for your trip...",
  "Calculating your daily budget breakdown...",
  "Finding local food recommendations...",
  "Mapping out transportation options...",
  "Almost there, polishing your perfect trip plan...",
];

function LoadingScreen() {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-6 px-4">
      <div className="relative w-20 h-20">
        <div className="w-20 h-20 border-4 border-green-200 rounded-full" />
        <div className="absolute top-0 left-0 w-20 h-20 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
      <h1 className="text-2xl font-bold text-green-600">KelanaAI</h1>
      <div className="text-center max-w-sm min-h-[3rem]">
        <p key={msgIndex} className="text-gray-700 font-medium text-base animate-pulse">
          {LOADING_MESSAGES[msgIndex]}
        </p>
      </div>
      <p className="text-xs text-gray-400">
        Powered by <span className="font-semibold text-gray-500">Amazon Nova Lite</span> via AWS Bedrock
      </p>
    </main>
  );
}

export default function TripDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  const [trip, setTrip] = useState<TripResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    const stored = localStorage.getItem("user");
    const user = stored ? JSON.parse(stored) : null;

    // not logged in — send to login
    if (!user?.token) {
      router.push("/login");
      return;
    }

    fetch(`http://localhost:8000/api/v1/trips/${id}`, {
      headers: { Authorization: `Bearer ${user?.token}` },
    })
      .then((res) => {
        if (res.status === 403) throw new Error("Forbidden: You do not have permission to view this trip");
        if (res.status === 401) throw new Error("Unauthorized: Please log in to view this trip");
        if (!res.ok) throw new Error(`Trip not found (${res.status})`);
        return res.json();
      })
      .then((data) => setTrip(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingScreen />;

  if (error || !trip) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error || "Trip not found."}</p>
        <button
          onClick={() => router.push("/")}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
        >
          Back to Home
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8 sm:py-12 px-4">
      <TopBar />
      <div className="max-w-3xl mx-auto">

        {/* Hero Image */}
        {trip.hero_image && (
          <div className="mb-6 sm:mb-8 rounded-2xl overflow-hidden shadow-lg h-48 sm:h-64 w-full">
            <img
              src={trip.hero_image}
              alt={`${trip.destination} hero`}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
            />
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-green-600 mb-1">KelanaAI</h1>
          <p className="text-gray-400 text-xs sm:text-sm">Powered by Amazon Nova Lite via AWS Bedrock</p>
        </div>

        {/* Trip Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow p-3 sm:p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Destination</p>
            <p className="font-semibold text-gray-800 mt-1 text-sm sm:text-base">{trip.destination}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-3 sm:p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Duration</p>
            <p className="font-semibold text-gray-800 mt-1 text-sm sm:text-base">{trip.days} days</p>
          </div>
          <div className="bg-white rounded-xl shadow p-3 sm:p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Total Budget</p>
            <p className="font-semibold text-gray-800 mt-1 text-sm sm:text-base">USD {trip.budget}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-3 sm:p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Daily Budget</p>
            <p className="font-semibold text-gray-800 mt-1 text-sm sm:text-base">USD {trip.daily_budget.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-3 sm:p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Category</p>
            <p className="font-semibold text-gray-800 mt-1 text-sm sm:text-base">{trip.category}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-3 sm:p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Transportation</p>
            <p className="font-semibold text-gray-800 mt-1 text-sm sm:text-base">{trip.transportation}</p>
          </div>
        </div>

        {/* AI Itinerary */}
        {trip.ai_recommendation && (
          <div className="bg-white rounded-2xl shadow p-5 sm:p-8">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-green-600 font-bold text-lg">AI Itinerary</span>
              <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-3 py-1">
                Amazon Nova Lite
              </span>
            </div>
            <div className="prose prose-sm max-w-none text-gray-700
              prose-headings:text-green-700
              prose-h2:text-xl prose-h2:font-bold prose-h2:mt-6 prose-h2:mb-2
              prose-h3:text-base prose-h3:font-semibold prose-h3:mt-4 prose-h3:mb-1
              prose-h4:text-sm prose-h4:font-semibold prose-h4:mt-3 prose-h4:mb-1
              prose-ul:list-disc prose-ul:pl-5
              prose-li:my-0.5
            ">
              <ReactMarkdown>{trip.ai_recommendation}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Back buttons */}
        <div className="mt-8 flex rounded-xl overflow-hidden border-2 border-green-600 bg-white shadow-sm">
          <button
            onClick={() => router.push("/")}
            className="flex-1 py-2 text-xs font-semibold text-green-600 hover:bg-green-600 hover:text-white active:scale-95 transition-all duration-150"
          >
            Generate Another Trip
          </button>
          <div className="w-px bg-green-600" />
          <button
            onClick={() => router.push("/?tab=trips")}
            className="flex-1 py-2 text-xs font-semibold text-green-600 hover:bg-green-600 hover:text-white active:scale-95 transition-all duration-150"
          >
            My Trips
          </button>
        </div>

      </div>
    </main>
  );
}
