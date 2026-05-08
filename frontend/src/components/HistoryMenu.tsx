import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { History, ChevronDown } from 'lucide-react'
import { useAuth, type HistoryItem } from '@/store/auth'

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
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-white/85 hover:bg-white/10 transition-colors"
      >
        <History className="w-3.5 h-3.5" />
        내 분석
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 max-h-80 overflow-auto rounded-xl border border-white/10 bg-[#141414] shadow-xl py-1 z-50">
          <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between gap-2">
            <span className="text-[10px] text-white/50 truncate">{email}</span>
            <button
              type="button"
              className="text-[10px] text-white/60 hover:text-white shrink-0"
              onClick={() => { logout(); setOpen(false) }}
            >
              로그아웃
            </button>
          </div>
          {items.length === 0 ? (
            <p className="px-3 py-6 text-xs text-white/45 text-center">아직 저장된 분석이 없습니다.</p>
          ) : (
            items.map((it) => (
              <button
                key={`${it.keyword}-${it.at}`}
                type="button"
                className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 flex items-center justify-between gap-2"
                onClick={() => {
                  setOpen(false)
                  navigate(`/result/${encodeURIComponent(it.keyword)}`)
                }}
              >
                <span className="font-medium text-white/90 truncate">{it.keyword}</span>
                {it.verdict ? (
                  <span className="font-mono text-[10px] text-white/40 shrink-0">{it.verdict}</span>
                ) : null}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
