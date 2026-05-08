import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type HistoryItem = { keyword: string; verdict: string; at: number }

interface AuthState {
  token: string | null
  email: string | null
  setSession: (token: string, email: string) => void
  logout: () => void
  fetchHistory: () => Promise<HistoryItem[]>
  recordSearch: (keyword: string, verdict: string) => Promise<void>
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      email: null,

      setSession: (token, email) => set({ token, email }),

      logout: () => set({ token: null, email: null }),

      fetchHistory: async () => {
        const { token } = get()
        if (!token) return []
        try {
          const r = await fetch('/api/history', {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (!r.ok) return []
          const j = (await r.json()) as { items?: HistoryItem[] }
          return j.items ?? []
        } catch {
          return []
        }
      },

      recordSearch: async (keyword, verdict) => {
        const { token } = get()
        if (!token) return
        try {
          await fetch('/api/history', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ keyword, verdict }),
          })
        } catch {
          /* noop */
        }
      },
    }),
    { name: 'exeat-auth' },
  ),
)
