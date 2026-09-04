"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import TopBar from "@/components/TopBar";

const API = "http://localhost:8000/api/v1";

interface Conversation {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

function authHeaders(): HeadersInit {
  const stored = typeof window !== "undefined" ? localStorage.getItem("user") : null;
  const user = stored ? JSON.parse(stored) : null;
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${user?.token}`,
  };
}

export default function ChatPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find((c) => c.id === activeId);

  // guard: must be logged in
  useEffect(() => {
    if (!localStorage.getItem("user")) router.push("/login");
  }, [router]);

  // load conversation list
  useEffect(() => {
    fetch(`${API}/conversations`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setConversations(Array.isArray(data) ? data : []))
      .catch(() => setConversations([]))
      .finally(() => setLoadingList(false));
  }, []);

  // load messages when a conversation is selected
  useEffect(() => {
    if (activeId == null) {
      setMessages([]);
      return;
    }
    fetch(`${API}/conversations/${activeId}`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setMessages(data?.messages ?? []);
        // jump straight to the latest message when a conversation is opened
        requestAnimationFrame(() => {
          bottomRef.current?.scrollIntoView({ behavior: "auto" });
        });
      })
      .catch(() => setMessages([]));
  }, [activeId]);

  // smooth auto scroll to newest message as chat updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function handleNewConversation() {
    const res = await fetch(`${API}/conversations`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({}),
    });
    if (!res.ok) return;
    const convo = await res.json();
    setConversations((prev) => [convo, ...prev]);
    setActiveId(convo.id);
    setMessages([]);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    let convoId = activeId;

    // if no conversation selected, create one first
    if (convoId == null) {
      const res = await fetch(`${API}/conversations`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({}),
      });
      if (!res.ok) return;
      const convo = await res.json();
      setConversations((prev) => [convo, ...prev]);
      convoId = convo.id;
      setActiveId(convo.id);
    }

    // optimistic user message
    const optimistic: Message = {
      id: Date.now(),
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    setSending(true);

    // ensure the processing animation shows for at least 3 seconds
    const minDelay = new Promise((resolve) => setTimeout(resolve, 3000));

    try {
      const res = await fetch(`${API}/conversations/${convoId}/messages`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ content: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to send");

      // wait out the remainder of the minimum animation time
      await minDelay;

      // replace with the authoritative message list from the server
      setMessages(data.messages ?? []);

      // update the conversation title/order in the sidebar
      setConversations((prev) => {
        const updated = prev.map((c) =>
          c.id === convoId ? { ...c, title: data.title } : c
        );
        const active = updated.find((c) => c.id === convoId);
        const rest = updated.filter((c) => c.id !== convoId);
        return active ? [active, ...rest] : updated;
      });
    } catch {
      await minDelay;
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function handleRename(id: number, currentTitle: string) {
    const newTitle = window.prompt("Rename conversation:", currentTitle);
    if (newTitle == null) return;
    const trimmed = newTitle.trim();
    if (!trimmed || trimmed === currentTitle) return;

    const res = await fetch(`${API}/conversations/${id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ title: trimmed }),
    });
    if (!res.ok) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: trimmed } : c))
    );
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Delete this conversation? This cannot be undone.")) return;

    const res = await fetch(`${API}/conversations/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) return;
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) {
      setActiveId(null);
      setMessages([]);
    }
  }

  function formatTime(iso: string) {
    try {
      return new Date(iso).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }

  function formatMessageTime(iso: string) {
    try {
      const d = new Date(iso);
      const today = new Date();
      const sameDay = d.toDateString() === today.toDateString();
      return sameDay
        ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 py-6 px-4">
      <TopBar />
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-green-600">Chat with KelanaAI</h1>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 h-[70vh]">
          {/* Left: conversation list */}
          <aside className="sm:w-64 shrink-0 bg-white rounded-2xl shadow flex flex-col overflow-hidden">
            <button
              onClick={handleNewConversation}
              className="m-3 py-2 text-sm font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 active:scale-95 transition-all duration-150"
            >
              + New Chat
            </button>
            <div className="flex-1 overflow-y-auto px-2 pb-2">
              {loadingList ? (
                <p className="text-xs text-gray-400 text-center py-4">Loading...</p>
              ) : conversations.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No conversations yet.</p>
              ) : (
                conversations.map((c) => (
                  <div
                    key={c.id}
                    className={`group flex items-center gap-1 rounded-lg px-2 py-2 mb-1 transition ${
                      activeId === c.id ? "bg-green-100" : "hover:bg-gray-50"
                    }`}
                  >
                    {/* Rename + Delete icons on the left */}
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRename(c.id, c.title); }}
                        aria-label="Rename"
                        title="Rename"
                        className="text-gray-400 hover:text-green-600 transition"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                        aria-label="Delete"
                        title="Delete"
                        className="text-gray-400 hover:text-red-500 transition"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path fillRule="evenodd" d="M9 3a1 1 0 00-1 1v1H5a1 1 0 000 2h1v11a2 2 0 002 2h8a2 2 0 002-2V7h1a1 1 0 100-2h-3V4a1 1 0 00-1-1H9zm0 2h6v1H9V5zm-1 3h8v10H8V8zm2 2a1 1 0 012 0v5a1 1 0 11-2 0v-5zm4 0a1 1 0 012 0v5a1 1 0 11-2 0v-5z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>

                    {/* Conversation title + timestamp */}
                    <button
                      onClick={() => setActiveId(c.id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className="text-sm font-medium text-gray-800 truncate">{c.title}</p>
                      <p className="text-[11px] text-gray-400">{formatTime(c.updated_at)}</p>
                    </button>
                  </div>
                ))
              )}
            </div>
          </aside>

          {/* Right: dialogue */}
          <section className="flex-1 bg-white rounded-2xl shadow flex flex-col overflow-hidden">
            {/* Chat header */}
            <div className="border-b border-gray-100 px-4 py-3">
              <h2 className="text-lg font-bold text-gray-800 truncate">
                {activeConversation?.title || "New Conversation"}
              </h2>
              <p className="text-xs text-green-600 font-medium">KelanaAI Travel Assistant</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center text-gray-400 text-sm px-6">
                  {activeId == null
                    ? "Start a new chat or pick a conversation on the left."
                    : "Say something to begin the conversation."}
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
                  >
                    {m.role === "user" ? (
                      <div className="max-w-[80%] rounded-2xl rounded-br-sm px-4 py-2 text-sm whitespace-pre-wrap leading-relaxed bg-red-100 text-gray-800">
                        {m.content}
                        <span className="block text-[10px] text-gray-500 mt-1 text-right">
                          {formatMessageTime(m.created_at)}
                        </span>
                      </div>
                    ) : (
                      <div className="max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-2 bg-green-100 text-gray-800">
                        <div className="prose prose-sm max-w-none
                          prose-headings:text-green-700
                          prose-h1:text-lg prose-h1:font-bold prose-h1:mt-3 prose-h1:mb-1
                          prose-h2:text-base prose-h2:font-bold prose-h2:mt-3 prose-h2:mb-1
                          prose-h3:text-sm prose-h3:font-semibold prose-h3:mt-2 prose-h3:mb-1
                          prose-h4:text-sm prose-h4:font-semibold prose-h4:mt-2 prose-h4:mb-1
                          prose-p:my-1 prose-p:leading-relaxed
                          prose-ul:list-disc prose-ul:pl-5 prose-ul:my-1
                          prose-ol:list-decimal prose-ol:pl-5 prose-ol:my-1
                          prose-li:my-0.5
                          prose-strong:text-gray-900
                          prose-a:text-green-700
                        ">
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                        <span className="block text-[10px] text-gray-500 mt-1">
                          {formatMessageTime(m.created_at)}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}

              {sending && (
                <div className="flex justify-start">
                  <div className="bg-green-100 text-gray-600 rounded-2xl rounded-bl-sm px-4 py-2 text-sm flex items-center gap-2">
                    <span className="italic">KelanaAI is processing the answer</span>
                    <span className="inline-flex gap-0.5">
                      <span className="animate-bounce">.</span>
                      <span className="animate-bounce [animation-delay:0.15s]">.</span>
                      <span className="animate-bounce [animation-delay:0.3s]">.</span>
                    </span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="border-t border-gray-100 p-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="w-full border border-gray-300 rounded-full pl-4 pr-12 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  aria-label="Send"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-green-600 text-white hover:bg-green-700 active:scale-95 transition-all duration-150 disabled:opacity-40"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
