import { useEffect, useMemo, useState } from 'react'
import {
  BrowserRouter, Routes, Route, NavLink, useLocation, useNavigate,
} from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Toaster } from '@/components/ui/sonner'
import LoginModal from '@/components/LoginModal'
import HistoryMenu from '@/components/HistoryMenu'
import Home from '@/pages/Home'
import Result from '@/pages/Result'
import Simulate from '@/pages/Simulate'
import { useAuth } from '@/store/auth'
import { Button } from '@/components/ui/button'

const NAV = [
  { to: '/', label: '홈', exact: true },
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
  const [initialMode, setInitialMode] = useState<'login' | 'register'>('login')
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
      <header className="sticky top-0 z-20 border-b border-border/40 acrylic" style={{ boxShadow: 'var(--shadow-4)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <NavLink to="/" className="flex items-center gap-2 shrink-0 min-w-0">
            <img src="/logo.png" alt="ExEAT" className="w-7 h-7 object-contain" />
            <span className="font-semibold text-sm tracking-tight truncate">ExEAT</span>
            <span className="text-[10px] text-muted-foreground hidden lg:inline truncate">
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
                      ? 'bg-foreground text-background font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  serverOk === null ? 'bg-muted-foreground animate-pulse'
                  : serverOk ? 'bg-[var(--color-go)]'
                  : 'bg-[var(--color-stop)]'
                }`}
              />
              <span className="hidden md:inline">
                {serverOk === true ? '연결됨' : serverOk === false ? '오프라인' : '…'}
              </span>
            </div>
            <HistoryMenu />
            {!email ? (
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => { setInitialMode('register'); setLoginOpen(true) }}
                >
                  회원가입
                </Button>
                <Button
                  size="sm"
                  onClick={() => { setInitialMode('login'); setLoginOpen(true) }}
                >
                  로그인
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </header>
      <LoginModal open={loginOpen} initialMode={initialMode} onClose={() => setLoginOpen(false)} />
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

function AuthCallback() {
  const location = useLocation()
  const navigate = useNavigate()
  const setSession = useAuth((s) => s.setSession)

  const params = useMemo(() => new URLSearchParams(location.search), [location.search])
  const token = params.get('token')
  const email = params.get('email')
  const error = params.get('error')

  useEffect(() => {
    if (error) {
      navigate('/', { replace: true })
      return
    }
    if (token && email) {
      setSession(token, email)
      navigate('/', { replace: true })
    }
  }, [token, email, error, navigate, setSession])

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
      <div className="fluent-card rounded-2xl p-8">
        <p className="text-sm text-muted-foreground">로그인 처리 중…</p>
      </div>
    </div>
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
          <Route path="/auth/callback" element={<AuthCallback />} />
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
