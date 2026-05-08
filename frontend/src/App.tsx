import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Toaster } from '@/components/ui/sonner'
import TrendChart from '@/components/TrendChart'
import CaseLibrary from '@/components/CaseLibrary'
import Simulator from '@/components/Simulator'
import RegionPanel from '@/components/RegionPanel'

// ─── types ────────────────────────────────────────────────────────────────────

type TrendPoint = { period: string; ratio: number }
type TrendResult = {
  keyword: string
  startDate: string
  endDate: string
  weeks: TrendPoint[]
  shoppingWeeks?: TrendPoint[]
  stage: Stage
  verdict: Verdict
  exitWeek: number | null
  peakWeek: number
  peakRatio: number
  currentRatio: number
  avgRecent: number
  avgPrev: number
  reasoning?: string
}
type Verdict = 'GO' | 'WAIT' | 'STOP'
type Stage = 'rising' | 'peak' | 'declining' | 'stable'

// ─── verdict config ───────────────────────────────────────────────────────────
const VERDICT_CONFIG = {
  GO: {
    label: 'GO',
    sub: '지금 도입 적기입니다',
    desc: '검색 트렌드가 상승 중입니다. 경쟁자보다 먼저 선점하세요.',
    dot: 'bg-[var(--color-go)]',
    badge: 'bg-[var(--color-go-bg)] text-[var(--color-go)] border-[var(--color-go)]',
  },
  WAIT: {
    label: 'WAIT',
    sub: '조금 더 지켜보세요',
    desc: '트렌드가 정점 또는 안정기입니다. 수익성을 먼저 검토하세요.',
    dot: 'bg-[var(--color-wait)]',
    badge: 'bg-[var(--color-wait-bg)] text-[var(--color-wait)] border-[var(--color-wait)]',
  },
  STOP: {
    label: 'STOP',
    sub: '진입 비추천입니다',
    desc: '검색 트렌드가 하락 중입니다. 재고 소진 계획을 먼저 세우세요.',
    dot: 'bg-[var(--color-stop)]',
    badge: 'bg-[var(--color-stop-bg)] text-[var(--color-stop)] border-[var(--color-stop)]',
  },
}

// ─── skeleton blocks ──────────────────────────────────────────────────────────

function VerdictSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-20 rounded-lg" />
        <Skeleton className="h-5 w-36" />
      </div>
      <Skeleton className="h-px w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="grid grid-cols-3 gap-2">
        <Skeleton className="h-14 rounded-lg" />
        <Skeleton className="h-14 rounded-lg" />
        <Skeleton className="h-14 rounded-lg" />
      </div>
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-[200px] w-full rounded-xl" />
    </div>
  )
}

// ─── app ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [serverOk, setServerOk] = useState<boolean | null>(null)
  const [keyword, setKeyword] = useState('')
  const [trend, setTrend]     = useState<TrendResult | null>(null)
  const [stage, setStage]     = useState<Stage | null>(null)
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [loading, setLoading] = useState(false)

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
    setTrend(null)
    setVerdict(null)
    setStage(null)
    try {
      const res = await fetch('/api/ask', {
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
      setTrend(data)
      setStage(data.stage ?? null)
      setVerdict(data.verdict ?? null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e), {
        description: '키워드를 다시 확인하거나 잠시 후 시도해주세요.',
        duration: 5000,
      })
    } finally {
      setLoading(false)
    }
  }

  const vc = verdict ? VERDICT_CONFIG[verdict] : null

  return (
    <div className="min-h-svh flex flex-col bg-background">
      <Toaster position="top-center" />

      {/* ── header ── */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-base tracking-tight">ExEAT</span>
            <span className="text-xs text-muted-foreground hidden sm:block">
              카페 트렌드 EXIT 타이밍 진단
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={`w-1.5 h-1.5 rounded-full ${
              serverOk === null ? 'bg-muted-foreground animate-pulse' :
              serverOk ? 'bg-[var(--color-go)]' : 'bg-[var(--color-stop)]'
            }`} />
            <span className="hidden xs:inline">
              {serverOk === true ? 'API 연결됨' : serverOk === false ? 'API 오프라인' : '확인 중'}
            </span>
          </div>
        </div>
      </header>

      {/* ── main ── */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-4 sm:gap-5">

        {/* F9 — AskBox */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm sm:text-base font-semibold leading-snug">
              이 메뉴, 지금 카페에 들어가도 될까요?
            </CardTitle>
            <p className="text-xs sm:text-sm text-muted-foreground">
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
                className="flex-1 text-sm"
              />
              <Button
                onClick={onAnalyze}
                disabled={loading || !keyword.trim()}
                className="shrink-0"
              >
                {loading ? '분석 중…' : '분석하기'}
              </Button>
            </div>
            {/* 예시 키워드 빠른 선택 */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {['두바이초콜릿', '흑당버블티', '탕후루', '크로플', '마라탕'].map((kw) => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => { setKeyword(kw); }}
                  className="text-[11px] px-2 py-0.5 rounded-full border border-border text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
                >
                  {kw}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* F1/F2 — VerdictCard */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm sm:text-base font-semibold">진입 판정</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <VerdictSkeleton />
            ) : vc ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge
                    variant="outline"
                    className={`text-base sm:text-lg font-mono font-bold px-4 py-1.5 ${vc.badge}`}
                  >
                    {vc.label}
                  </Badge>
                  <span className="font-medium text-sm sm:text-base">{vc.sub}</span>
                </div>
                <Separator />
                <p className="text-sm text-muted-foreground">{vc.desc}</p>
                {trend?.exitWeek && (
                  <p className="text-xs text-muted-foreground font-mono">
                    ⚠ 약 <strong>{trend.exitWeek}주 후</strong> 검색량 50% 이하 예상
                  </p>
                )}
                {trend?.reasoning && (
                  <>
                    <Separator />
                    <div className="bg-secondary rounded-xl p-3 sm:p-4">
                      <p className="text-[10px] sm:text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">AI 분석</p>
                      <p className="text-xs sm:text-sm whitespace-pre-line leading-relaxed">
                        {trend.reasoning}
                      </p>
                    </div>
                  </>
                )}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {(['GO', 'WAIT', 'STOP'] as Verdict[]).map((v) => (
                    <div
                      key={v}
                      className={`rounded-lg px-2 sm:px-3 py-2 text-center border transition-all ${
                        verdict === v
                          ? VERDICT_CONFIG[v].badge + ' font-semibold'
                          : 'border-border text-muted-foreground'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full mx-auto mb-1 ${VERDICT_CONFIG[v].dot} ${verdict !== v ? 'opacity-30' : ''}`} />
                      {v}
                    </div>
                  ))}
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
              <CardTitle className="text-sm sm:text-base font-semibold">검색량 트렌드</CardTitle>
              {trend && stage && !loading && (
                <Badge variant="outline" className="font-mono text-xs">
                  {stage === 'rising'   ? '↑ 상승기' :
                   stage === 'peak'     ? '▲ 정점' :
                   stage === 'declining'? '↓ 하락기' : '— 안정기'}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton />
            ) : trend ? (
              <TrendChart
                data={trend.weeks}
                shoppingData={trend.shoppingWeeks}
                keyword={trend.keyword}
                stage={stage}
              />
            ) : (
              <div className="h-[200px] flex items-center justify-center">
                <p className="text-sm text-muted-foreground text-center px-4">
                  키워드를 분석하면 12주 그래프가 표시됩니다.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* F7 — CaseLibrary (분석 후에만 노출) */}
        {(loading || trend) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base font-semibold">유사 패턴 과거 사례</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                </div>
              ) : trend ? (
                <CaseLibrary pattern={
                  trend.stage === 'declining' || trend.stage === 'peak'
                    ? 'sudden_rise_fall'
                    : null
                } />
              ) : null}
            </CardContent>
          </Card>
        )}

        {/* F4 — RegionPanel (분석 후에만) */}
        {(loading || trend) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base font-semibold">지역 적합도</CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground">
                지역별 인구 구조와 트렌드 단계를 결합해 도입 적합도를 분석합니다.
              </p>
            </CardHeader>
            <CardContent>
              <RegionPanel stage={stage} />
            </CardContent>
          </Card>
        )}

        {/* F6 — Simulator */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm sm:text-base font-semibold">손익분기 시뮬레이터</CardTitle>
            <p className="text-xs sm:text-sm text-muted-foreground">
              재료비와 판매가를 입력하면 손익분기 시점과 EXIT 전 예상 수익을 계산합니다.
            </p>
          </CardHeader>
          <CardContent>
            <Simulator defaultExitWeek={trend?.exitWeek ?? null} />
          </CardContent>
        </Card>

      </main>

      {/* ── footer ── */}
      <footer className="border-t border-border px-4 py-4 text-xs text-muted-foreground text-center">
        ExEAT · 트렌드 재료의 EXIT 타이밍을 알려드립니다
        {trend && (
          <> · <span className="font-mono">{trend.startDate} ~ {trend.endDate}</span></>
        )}
      </footer>
    </div>
  )
}
