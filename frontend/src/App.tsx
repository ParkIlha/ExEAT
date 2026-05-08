import { useEffect, useState } from 'react'
import './App.css'

// ─── types ────────────────────────────────────────────────────────────────────

type Health = { ok: boolean; service: string; message: string }

type TrendPoint = { period: string; ratio: number }
type TrendResult = {
  keyword: string
  startDate: string
  endDate: string
  weeks: TrendPoint[]
}

type Verdict = 'GO' | 'WAIT' | 'STOP' | null

// ─── helpers ──────────────────────────────────────────────────────────────────

async function fetchHealth(): Promise<Health> {
  const res = await fetch('/api/health')
  if (!res.ok) throw new Error(`health ${res.status}`)
  return res.json() as Promise<Health>
}

async function fetchTrend(keyword: string): Promise<TrendResult> {
  const res = await fetch('/api/trend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword }),
  })
  const json = (await res.json()) as unknown
  if (!res.ok) {
    const msg =
      typeof json === 'object' && json && 'error' in json
        ? String((json as { error: unknown }).error)
        : `trend ${res.status}`
    throw new Error(msg)
  }
  return json as TrendResult
}

// ─── sub-components ───────────────────────────────────────────────────────────

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  if (!verdict) return null
  const styles: Record<NonNullable<Verdict>, string> = {
    GO:   'bg-[var(--color-go-bg)]   text-[var(--color-go)]   border-[var(--color-go)]',
    WAIT: 'bg-[var(--color-wait-bg)] text-[var(--color-wait)] border-[var(--color-wait)]',
    STOP: 'bg-[var(--color-stop-bg)] text-[var(--color-stop)] border-[var(--color-stop)]',
  }
  const labels: Record<NonNullable<Verdict>, string> = {
    GO:   '지금 도입해도 됩니다',
    WAIT: '조금 더 지켜보세요',
    STOP: '이미 늦었습니다',
  }
  return (
    <div className={`inline-flex items-center gap-2 border rounded-xl px-4 py-2 ${styles[verdict]}`}>
      <span className="font-mono font-semibold text-xl tracking-wider">{verdict}</span>
      <span className="text-sm">{labels[verdict]}</span>
    </div>
  )
}

// ─── main app ─────────────────────────────────────────────────────────────────

export default function App() {
  const [serverOk, setServerOk] = useState<boolean | null>(null)
  const [keyword, setKeyword] = useState('')
  const [trend, setTrend] = useState<TrendResult | null>(null)
  const [verdict] = useState<Verdict>(null)     // STEP 6에서 채워질 예정
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchHealth()
      .then((h) => setServerOk(h.ok))
      .catch(() => setServerOk(false))
  }, [])

  async function onAnalyze() {
    if (!keyword.trim()) return
    setLoading(true)
    setError(null)
    setTrend(null)
    try {
      const result = await fetchTrend(keyword.trim())
      setTrend(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-svh flex flex-col bg-[var(--color-bg)]">
      {/* ── header ── */}
      <header className="w-full border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-xl tracking-tight text-[var(--color-ink)]">ExEAT</span>
          <span className="text-xs text-[var(--color-muted)]">트렌드 EXIT 타이밍 진단</span>
        </div>
        <div className="text-xs text-[var(--color-muted)] flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full inline-block ${
              serverOk === null
                ? 'bg-[var(--color-muted)]'
                : serverOk
                ? 'bg-[var(--color-go)]'
                : 'bg-[var(--color-stop)]'
            }`}
          />
          {serverOk === null ? '서버 확인 중' : serverOk ? '서버 연결됨' : '서버 연결 안 됨'}
        </div>
      </header>

      {/* ── main ── */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 flex flex-col gap-6">

        {/* F9 — AskBox */}
        <section className="bg-white border border-[var(--color-border)] rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-semibold mb-1">이 메뉴, 지금 들어가도 될까요?</h2>
          <p className="text-sm text-[var(--color-muted)] mb-4">
            키워드를 입력하면 12주 트렌드 데이터로 진입 타이밍을 분석해드립니다.
          </p>
          <div className="flex gap-2 flex-wrap">
            <input
              className="flex-1 min-w-[200px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[var(--color-ink)] transition-colors"
              placeholder="예: 두바이초콜릿, 흑당버블티"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onAnalyze()}
            />
            <button
              className="bg-[var(--color-ink)] text-white rounded-xl px-5 py-2.5 text-sm font-medium hover:opacity-80 disabled:opacity-40 transition-opacity"
              onClick={onAnalyze}
              disabled={loading || !keyword.trim()}
            >
              {loading ? '분석 중…' : '분석하기'}
            </button>
          </div>
          {error && (
            <p className="mt-3 text-xs text-[var(--color-stop)]">{error}</p>
          )}
        </section>

        {/* F1/F2 — VerdictCard (placeholder until STEP 6) */}
        <section className="bg-white border border-[var(--color-border)] rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-semibold mb-3">진입 판정</h2>
          {verdict ? (
            <VerdictBadge verdict={verdict} />
          ) : (
            <p className="text-sm text-[var(--color-muted)]">
              {trend
                ? '수명주기 분석 로직 연결 대기 중 (STEP 6)'
                : '키워드를 분석하면 판정 결과가 표시됩니다.'}
            </p>
          )}
        </section>

        {/* F3 — TrendChart (placeholder until STEP 5) */}
        <section className="bg-white border border-[var(--color-border)] rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-semibold mb-3">검색량 트렌드</h2>
          {trend ? (
            <div>
              <p className="text-xs text-[var(--color-muted)] font-mono mb-3">
                {trend.keyword} · {trend.startDate} ~ {trend.endDate} · {trend.weeks.length}주
              </p>
              {/* 임시: raw 수치 바 차트 — STEP 5에서 recharts로 교체 */}
              <div className="flex items-end gap-1 h-28">
                {trend.weeks.map((w) => (
                  <div key={w.period} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-[var(--color-ink)] rounded-sm opacity-70"
                      style={{ height: `${Math.max(w.ratio, 2)}%` }}
                    />
                    <span className="text-[10px] font-mono text-[var(--color-muted)] hidden md:block">
                      {w.period.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-muted)]">
              키워드를 분석하면 12주 그래프가 표시됩니다.
            </p>
          )}
        </section>
      </main>

      {/* ── footer ── */}
      <footer className="border-t border-[var(--color-border)] px-6 py-3 text-xs text-[var(--color-muted)] text-center">
        ExEAT · 트렌드 재료의 EXIT 타이밍을 알려드립니다
      </footer>
    </div>
  )
}
