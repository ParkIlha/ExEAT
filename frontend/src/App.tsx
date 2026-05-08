import { useEffect, useState } from 'react'
import {
  BrowserRouter, Routes, Route, NavLink, useLocation,
} from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Toaster } from '@/components/ui/sonner'
import LoginModal from '@/components/LoginModal'
import HistoryMenu from '@/components/HistoryMenu'
import Home from '@/pages/Home'
import Result from '@/pages/Result'
import Simulate from '@/pages/Simulate'
import { useAuth } from '@/store/auth'

const NAV = [
  { to: '/', label: '홈', exact: true },
  { to: '/simulate', label: '시뮬레이터', exact: false },
]

const DEMO_KEYWORDS = ['우베', '흑임자라떼', '크로플', '마라탕', '치킨']

async function clearAllCaches() {
  try {
    await fetch('/api/cache/clear', { method: 'POST' })
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem('exeat-analysis')
    localStorage.removeItem('exeat-auth')
  } catch {
    /* ignore */
  }
  window.location.reload()
}

function Header() {
  const [serverOk, setServerOk] = useState<boolean | null>(null)
  const [loginOpen, setLoginOpen] = useState(false)
  const email = useAuth((s) => s.email)

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((j: { ok: boolean }) => {
        setServerOk(j.ok)
        if (j.ok) {
          fetch('/api/warm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keywords: DEMO_KEYWORDS }),
          }).catch(() => {})
        }
      })
      .catch(() => setServerOk(false))
  }, [])

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0a0a0a] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <NavLink to="/" className="flex items-center gap-2 shrink-0 min-w-0">
            <img src="/logo.png" alt="ExEAT" className="w-7 h-7 object-contain" />
            <span className="font-semibold text-sm tracking-tight truncate">ExEAT</span>
            <span className="text-[10px] text-white/45 hidden lg:inline truncate">
              외식 트렌드 EXIT 진단
            </span>
          </NavLink>

          <nav className="flex items-center gap-0.5 sm:gap-1 flex-1 justify-end md:justify-center md:absolute md:left-1/2 md:-translate-x-1/2 md:flex-none">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.exact}
                className={({ isActive }) =>
                  `px-2.5 sm:px-3 py-1.5 rounded-lg text-xs transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-white/12 text-white font-medium'
                      : 'text-white/60 hover:text-white hover:bg-white/8'
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-white/45">
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  serverOk === null ? 'bg-white/35 animate-pulse'
                  : serverOk ? 'bg-emerald-400'
                  : 'bg-red-400'
                }`}
              />
              <span className="hidden md:inline">
                {serverOk === true ? '연결됨' : serverOk === false ? '오프라인' : '…'}
              </span>
            </div>
            <HistoryMenu />
            {!email ? (
              <button
                type="button"
                onClick={() => setLoginOpen(true)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white text-neutral-950 hover:bg-white/90 transition-colors"
              >
                로그인
              </button>
            ) : null}
          </div>
        </div>
      </header>
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border/60 px-4 py-5 text-[11px] text-muted-foreground">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6">
        <span>ExEAT · 외식 트렌드 EXIT 타이밍 진단 · 네이버 DataLab + AI</span>
        <button
          type="button"
          onClick={() => clearAllCaches()}
          className="text-[11px] underline underline-offset-2 hover:text-foreground transition-colors"
        >
          로컬·서버 캐시 초기화
        </button>
      </div>
    </footer>
  )
}

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      >
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/result/:keyword" element={<Result />} />
          <Route path="/simulate" element={<Simulate />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-svh flex flex-col bg-background">
        <Toaster position="top-center" />
        <Header />
        <main className="flex-1">
          <AnimatedRoutes />
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  )
}
