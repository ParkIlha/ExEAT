import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useAnalysis } from './analysis'

export type HistoryItem = { keyword: string; verdict: string; at: number }

interface AuthState {
  token: string | null
  email: string | null
  setSession: (token: string, email: string) => void
  logout: () => void
  fetchHistory: () => Promise<HistoryItem[]>
  recordSearch: (keyword: string, verdict: string) => Promise<void>
  syncProfile: () => Promise<void>
  saveProfile: (region: string, businessType: string) => Promise<void>
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      email: null,

      setSession: (token, email) => {
        set({ token, email })
        // 로그인 직후 서버에서 프로필 불러오기 (비동기, 완료 알림 없음)
        setTimeout(() => get().syncProfile(), 0)
      },

      logout: () => set({ token: null, email: null }),

      syncProfile: async () => {
        const { token } = get()
        if (!token) return
        try {
          const r = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (!r.ok) return
          const j = await r.json() as { user?: { region?: string; businessType?: string } }
          const region = j.user?.region
          const businessType = j.user?.businessType
          if (region && businessType) {
            useAnalysis.getState().setUserProfile({
              region,
              businessType: businessType as import('./analysis').BusinessType,
            })
          }
        } catch {
          /* noop */
        }
      },

      saveProfile: async (region, businessType) => {
        const { token } = get()
        if (!token) return
        try {
          await fetch('/api/auth/profile', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ region, businessType }),
          })
        } catch {
          /* noop */
        }
      },

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
