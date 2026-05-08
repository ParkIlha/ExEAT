import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import Home from '@/pages/Home'
import Result from '@/pages/Result'
import Simulate from '@/pages/Simulate'
import Cases from '@/pages/Cases'

// ─── nav links ────────────────────────────────────────────────────────────────

const NAV = [
  { to: '/',         label: '홈',       exact: true },
  { to: '/simulate', label: '시뮬레이터', exact: false },
  { to: '/cases',    label: '사례',     exact: false },
]

// ─── header ───────────────────────────────────────────────────────────────────

function Header() {
  const [serverOk, setServerOk] = useState<boolean | null>(null)
  const location = useLocation()
  const isHome = location.pathname === '/'

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((j: { ok: boolean }) => setServerOk(j.ok))
      .catch(() => setServerOk(false))
  }, [])

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className={`${isHome ? 'max-w-3xl' : 'max-w-3xl'} mx-auto px-4 sm:px-6 h-14 flex items-center justify-between`}>
        {/* 로고 */}
        <NavLink to="/" className="flex items-baseline gap-2 shrink-0">
          <span className="font-semibold text-base tracking-tight">ExEAT</span>
          <span className="text-[10px] text-muted-foreground hidden sm:block">EXIT 타이밍 진단</span>
        </NavLink>

        {/* 네비 */}
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

        {/* API 상태 */}
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

// ─── footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-border px-4 py-4 text-xs text-muted-foreground text-center">
      ExEAT · 카페 트렌드 EXIT 타이밍 진단 · 네이버 DataLab + Claude AI
    </footer>
  )
}

// ─── app ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-svh flex flex-col bg-background">
        <Toaster position="top-center" />
        <Header />
        <main className="flex-1">
          <Routes>
            <Route path="/"                element={<Home />} />
            <Route path="/result/:keyword" element={<Result />} />
            <Route path="/simulate"        element={<Simulate />} />
            <Route path="/cases"           element={<Cases />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  )
}
