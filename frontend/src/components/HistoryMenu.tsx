import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { History, ChevronDown } from 'lucide-react'
import { useAuth, type HistoryItem } from '@/store/auth'

const VERDICT_STYLE: Record<string, { color: string; label: string }> = {
  GO:   { color: 'var(--color-go)',   label: 'GO' },
  WAIT: { color: 'var(--color-wait)', label: 'WAIT' },
  STOP: { color: 'var(--color-stop)', label: 'STOP' },
}

export default function HistoryMenu() {
  const { token, email, logout, fetchHistory } = useAuth()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<HistoryItem[]>([])
  const navigate = useNavigate()
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  async function load() {
    if (!token) return
    const list = await fetchHistory()
    setItems(list)
  }

  useEffect(() => {
    if (open && token) load()
  }, [open, token])

  if (!token || !email) return null

  return (
    <div className="relative" ref={rootRef}>
      {/* 트리거 버튼 — 헤더 테마 색상 사용 */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      >
        <History className="w-3.5 h-3.5" />
        내 분석
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 max-h-80 overflow-auto rounded-xl border border-border bg-background shadow-xl py-1 z-50"
          style={{ boxShadow: 'var(--shadow-16)' }}
        >
          {/* 이메일 + 로그아웃 */}
          <div className="px-3 py-2 border-b border-border flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground truncate">{email}</span>
            <button
              type="button"
              className="text-[10px] text-muted-foreground hover:text-foreground shrink-0 transition-colors"
              onClick={() => { logout(); setOpen(false) }}
            >
              로그아웃
            </button>
          </div>

          {items.length === 0 ? (
            <p className="px-3 py-6 text-xs text-muted-foreground text-center">
              아직 저장된 분석이 없습니다.
            </p>
          ) : (
            items.map((it) => {
              const vs = it.verdict ? VERDICT_STYLE[it.verdict] : null
              return (
                <button
                  key={`${it.keyword}-${it.at}`}
                  type="button"
                  className="w-full text-left px-3 py-2.5 text-xs hover:bg-secondary transition-colors flex items-center justify-between gap-2"
                  onClick={() => {
                    setOpen(false)
                    navigate(`/result/${encodeURIComponent(it.keyword)}`)
                  }}
                >
                  <span className="font-medium text-foreground truncate">{it.keyword}</span>
                  {vs ? (
                    <span
                      className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded shrink-0"
                      style={{ color: vs.color, backgroundColor: vs.color + '18' }}
                    >
                      {vs.label}
                    </span>
                  ) : null}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
