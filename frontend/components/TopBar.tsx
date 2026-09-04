"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

interface StoredUser {
  id: number;
  name: string;
  email: string;
  token: string;
}

export default function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  if (!user) return null;

  const isHome = pathname === "/";
  const isAsk = pathname === "/ask";
  const isChat = pathname === "/chat";
  const isProfile = pathname === "/profile";

  const btn =
    "text-xs font-semibold text-green-600 border border-green-600 rounded-lg px-3 py-1 hover:bg-green-600 hover:text-white active:scale-95 transition-all duration-150";

  return (
    <div className="max-w-5xl mx-auto w-full flex flex-wrap justify-between items-center gap-2 mb-4 text-sm">
      <span className="text-gray-500">
        Hi, <span className="font-semibold text-gray-700">{user.name}</span>
      </span>

      <div className="flex items-center gap-2">
        {!isHome && (
          <button onClick={() => router.push("/")} className={btn}>
            Home
          </button>
        )}
        {!isAsk && (
          <button onClick={() => router.push("/ask")} className={btn}>
            Ask KelanaAI
          </button>
        )}
        {!isChat && (
          <button onClick={() => router.push("/chat")} className={btn}>
            Chat
          </button>
        )}
        {!isProfile && (
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
        )}
      </div>
    </div>
  );
}
