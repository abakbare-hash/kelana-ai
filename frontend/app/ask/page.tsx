"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/TopBar";

interface Source {
  document_id: string;
  location?: { s3Location?: { uri?: string }; type?: string };
  metadata?: { _document_title?: string; _source_uri?: string };
  score?: number;
}

export default function AskPage() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      router.push("/login");
    }
  }, [router]);

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError("");
    setAnswer("");
    setSources([]);

    try {
      const stored = localStorage.getItem("user");
      const user = stored ? JSON.parse(stored) : null;

      const res = await fetch("http://localhost:8000/api/v1/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ question }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Something went wrong");

      setAnswer(data.answer);
      setSources(data.source || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8 sm:py-12 px-4">
      <TopBar />
      <div className="max-w-2xl mx-auto w-full">

        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-green-600 mb-1">Ask KelanaAI</h1>
          <p className="text-gray-500 text-sm">
            Ask anything about your travel destinations — answers come from our travel knowledge base.
          </p>
        </div>

        {/* Ask form */}
        <form onSubmit={handleAsk} className="bg-white rounded-2xl shadow p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Your Question</label>
            <textarea
              placeholder="e.g. What are good travel tips for Tokyo?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-green-700 transition disabled:opacity-50"
          >
            {loading ? "Thinking..." : "Ask"}
          </button>
        </form>

        {/* Loading */}
        {loading && (
          <div className="mt-6 flex flex-col items-center gap-3 text-gray-500">
            <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-gray-400">Searching the knowledge base...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
            {error}
          </div>
        )}

        {/* Answer */}
        {answer && !loading && (
          <div className="mt-6 bg-white rounded-2xl shadow p-5 sm:p-6">
            <h2 className="text-green-600 font-bold text-sm mb-3">Answer</h2>
            <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{answer}</p>

            {/* Sources at the bottom */}
            {sources.length > 0 && (
              <div className="mt-5 pt-4 border-t border-gray-100">
                <p className="text-sm font-bold text-gray-700 mb-2">Source:</p>
                <ol className="list-decimal list-inside space-y-1">
                  {Array.from(
                    new Map(
                      sources.map((src) => {
                        const name =
                          src.metadata?._document_title ||
                          src.document_id.split("/").pop() ||
                          src.document_id;
                        const uri = src.location?.s3Location?.uri || src.document_id;
                        return [name, uri] as [string, string];
                      })
                    ).entries()
                  ).map(([name, uri]) => (
                    <li key={name} className="text-sm text-gray-600">
                      <a
                        href={uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:text-green-700 hover:underline"
                      >
                        {name}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Back */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push("/")}
            className="text-sm font-semibold text-green-600 hover:text-green-700 transition"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </main>
  );
}
