import { useEffect, useState } from 'react'
import {
  BrowserRouter, Routes, Route, NavLink, useLocation,
} from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Toaster } from '@/components/ui/sonner'
import Home from '@/pages/Home'
import Result from '@/pages/Result'
import Simulate from '@/pages/Simulate'

const NAV = [
  { to: '/',         label: '홈',        exact: true },
  { to: '/simulate', label: '시뮬레이터', exact: false },
]

// ─── header ───────────────────────────────────────────────────────────────────

function Header() {
  const [serverOk, setServerOk] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((j: { ok: boolean }) => setServerOk(j.ok))
      .catch(() => setServerOk(false))
  }, [])

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/70 backdrop-blur-md">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <NavLink to="/" className="flex items-baseline gap-2 shrink-0">
          <span className="font-bold text-base tracking-tight">ExEAT</span>
          <span className="text-[10px] text-muted-foreground hidden sm:block">외식 트렌드 EXIT 진단</span>
        </NavLink>

        <nav className="flex items-center gap-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.exact}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-xs transition-colors ${
                  isActive
                    ? 'bg-foreground text-background font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
          <span className={`w-1.5 h-1.5 rounded-full ${
            serverOk === null ? 'bg-muted-foreground animate-pulse' :
            serverOk ? 'bg-[var(--color-go)]' : 'bg-[var(--color-stop)]'
          }`} />
          <span className="hidden sm:inline">
            {serverOk === true ? '연결됨' : serverOk === false ? '오프라인' : '…'}
          </span>
        </div>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border/60 px-4 py-5 text-[11px] text-muted-foreground text-center">
      ExEAT · 외식 트렌드 EXIT 타이밍 진단 · 네이버 DataLab + AI
    </footer>
  )
}

// ─── 페이지 전환 애니메이션 ───────────────────────────────────────────────────

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
          <Route path="/"                element={<Home />} />
          <Route path="/result/:keyword" element={<Result />} />
          <Route path="/simulate"        element={<Simulate />} />
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
