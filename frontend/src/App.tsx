import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import TrendChart from '@/components/TrendChart'

// ─── types ────────────────────────────────────────────────────────────────────

type TrendPoint = { period: string; ratio: number }
type TrendResult = {
  keyword: string
  startDate: string
  endDate: string
  weeks: TrendPoint[]
}
type Verdict = 'GO' | 'WAIT' | 'STOP'
type Stage = 'rising' | 'peak' | 'declining' | 'stable'

// ─── simple client-side lifecycle guess (STEP 6에서 백엔드로 이동) ────────────
function guessStage(weeks: TrendPoint[]): { stage: Stage; verdict: Verdict } {
  if (weeks.length < 4) return { stage: 'stable', verdict: 'WAIT' }
  const recent = weeks.slice(-4).map((w) => w.ratio)
  const prev   = weeks.slice(-8, -4).map((w) => w.ratio)
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
  const prevAvg   = prev.length ? prev.reduce((a, b) => a + b, 0) / prev.length : recentAvg
  const delta = recentAvg - prevAvg

  if (delta > 8)  return { stage: 'rising',   verdict: 'GO' }
  if (delta < -8) return { stage: 'declining', verdict: 'STOP' }
  const peak = Math.max(...weeks.map((w) => w.ratio))
  if (recentAvg >= peak * 0.85) return { stage: 'peak', verdict: 'WAIT' }
  return { stage: 'stable', verdict: 'WAIT' }
}

// ─── verdict config ───────────────────────────────────────────────────────────
const VERDICT_CONFIG = {
  GO: {
    label: 'GO',
    sub: '지금 도입 적기입니다',
    desc: '검색 트렌드가 상승 중입니다. 경쟁자보다 먼저 선점하세요.',
    dot: 'bg-[var(--color-go)]',
    badge: 'bg-[var(--color-go-bg)] text-[var(--color-go)] border-[var(--color-go)]',
    bar: 'bg-[var(--color-go)]',
  },
  WAIT: {
    label: 'WAIT',
    sub: '조금 더 지켜보세요',
    desc: '트렌드가 정점 또는 안정기입니다. 수익성을 먼저 검토하세요.',
    dot: 'bg-[var(--color-wait)]',
    badge: 'bg-[var(--color-wait-bg)] text-[var(--color-wait)] border-[var(--color-wait)]',
    bar: 'bg-[var(--color-wait)]',
  },
  STOP: {
    label: 'STOP',
    sub: '진입 비추천입니다',
    desc: '검색 트렌드가 하락 중입니다. 재고 소진 계획을 먼저 세우세요.',
    dot: 'bg-[var(--color-stop)]',
    badge: 'bg-[var(--color-stop-bg)] text-[var(--color-stop)] border-[var(--color-stop)]',
    bar: 'bg-[var(--color-stop)]',
  },
}

// ─── app ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [serverOk, setServerOk] = useState<boolean | null>(null)
  const [keyword, setKeyword] = useState('')
  const [trend, setTrend]   = useState<TrendResult | null>(null)
  const [stage, setStage]   = useState<Stage | null>(null)
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((j: { ok: boolean }) => setServerOk(j.ok))
      .catch(() => setServerOk(false))
  }, [])

  async function onAnalyze() {
    const kw = keyword.trim()
    if (!kw) return
    setLoading(true)
    setError(null)
    setTrend(null)
    setVerdict(null)
    setStage(null)
    try {
      const res = await fetch('/api/trend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: kw }),
      })
      const json = (await res.json()) as unknown
      if (!res.ok) {
        const msg =
          typeof json === 'object' && json && 'error' in json
            ? String((json as { error: unknown }).error)
            : `오류 ${res.status}`
        throw new Error(msg)
      }
      const data = json as TrendResult
      const { stage: s, verdict: v } = guessStage(data.weeks)
      setTrend(data)
      setStage(s)
      setVerdict(v)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const vc = verdict ? VERDICT_CONFIG[verdict] : null

  return (
    <div className="min-h-svh flex flex-col bg-background">

      {/* ── header ── */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-lg tracking-tight">ExEAT</span>
            <span className="text-xs text-muted-foreground hidden sm:block">
              트렌드 EXIT 타이밍 진단
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={`w-1.5 h-1.5 rounded-full ${
              serverOk === null ? 'bg-muted-foreground' :
              serverOk ? 'bg-[var(--color-go)]' : 'bg-[var(--color-stop)]'
            }`} />
            {serverOk === true ? 'API 연결됨' : serverOk === false ? 'API 오프라인' : '확인 중'}
          </div>
        </div>
      </header>

      {/* ── main ── */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 flex flex-col gap-5">

        {/* F9 — AskBox */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              이 메뉴, 지금 카페에 들어가도 될까요?
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              키워드를 입력하면 최근 12주 네이버 검색 트렌드로 진입 타이밍을 분석합니다.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="예: 두바이초콜릿, 흑당버블티, 크로플"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onAnalyze()}
                className="flex-1"
              />
              <Button
                onClick={onAnalyze}
                disabled={loading || !keyword.trim()}
              >
                {loading ? '분석 중…' : '분석하기'}
              </Button>
            </div>
            {error && (
              <p className="mt-2 text-xs text-[var(--color-stop)]">{error}</p>
            )}
          </CardContent>
        </Card>

        {/* F1/F2 — VerdictCard */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">진입 판정</CardTitle>
          </CardHeader>
          <CardContent>
            {vc ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={`text-lg font-mono font-bold px-4 py-1.5 ${vc.badge}`}
                  >
                    {vc.label}
                  </Badge>
                  <span className="font-medium">{vc.sub}</span>
                </div>
                <Separator />
                <p className="text-sm text-muted-foreground">{vc.desc}</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {((['GO', 'WAIT', 'STOP'] as Verdict[]).map((v) => (
                    <div
                      key={v}
                      className={`rounded-lg px-3 py-2 text-center border ${
                        verdict === v
                          ? VERDICT_CONFIG[v].badge + ' font-semibold'
                          : 'border-border text-muted-foreground'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full mx-auto mb-1 ${VERDICT_CONFIG[v].dot} ${verdict !== v ? 'opacity-30' : ''}`} />
                      {v}
                    </div>
                  )))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-2">
                키워드를 분석하면 GO / WAIT / STOP 판정이 표시됩니다.
              </p>
            )}
          </CardContent>
        </Card>

        {/* F3 — TrendChart */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">검색량 트렌드</CardTitle>
              {trend && stage && (
                <Badge variant="outline" className="font-mono text-xs">
                  {stage === 'rising' ? '↑ 상승기' :
                   stage === 'peak'   ? '▲ 정점' :
                   stage === 'declining' ? '↓ 하락기' : '— 안정기'}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {trend ? (
              <TrendChart data={trend.weeks} keyword={trend.keyword} stage={stage} />
            ) : (
              <div className="h-[200px] flex items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  {loading ? '데이터를 불러오는 중…' : '키워드를 분석하면 12주 그래프가 표시됩니다.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

      </main>

      {/* ── footer ── */}
      <footer className="border-t border-border px-4 py-4 text-xs text-muted-foreground text-center">
        ExEAT · 트렌드 재료의 EXIT 타이밍을 알려드립니다 ·{' '}
        <span className="font-mono">
          {trend ? `${trend.startDate} ~ ${trend.endDate}` : '데이터 없음'}
        </span>
      </footer>
    </div>
  )
}
