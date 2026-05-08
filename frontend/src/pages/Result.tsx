import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import TrendChart from '@/components/TrendChart'
import RegionPanel from '@/components/RegionPanel'

// ─── types ────────────────────────────────────────────────────────────────────

type TrendPoint = { period: string; ratio: number }
type Verdict = 'GO' | 'WAIT' | 'STOP'
type Stage = 'rising' | 'peak' | 'declining' | 'stable'
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

const VERDICT_CONFIG = {
  GO: {
    label: 'GO',
    sub: '지금 도입 적기입니다',
    desc: '검색 트렌드가 상승 중입니다. 경쟁자보다 먼저 선점하세요.',
    dot: 'bg-[var(--color-go)]',
    badge: 'bg-[var(--color-go-bg)] text-[var(--color-go)] border-[var(--color-go)]',
    border: 'border-[var(--color-go)]',
  },
  WAIT: {
    label: 'WAIT',
    sub: '조금 더 지켜보세요',
    desc: '트렌드가 정점 또는 안정기입니다. 수익성을 먼저 검토하세요.',
    dot: 'bg-[var(--color-wait)]',
    badge: 'bg-[var(--color-wait-bg)] text-[var(--color-wait)] border-[var(--color-wait)]',
    border: 'border-[var(--color-wait)]',
  },
  STOP: {
    label: 'STOP',
    sub: '진입 비추천입니다',
    desc: '검색 트렌드가 하락 중입니다. 재고 소진 계획을 먼저 세우세요.',
    dot: 'bg-[var(--color-stop)]',
    badge: 'bg-[var(--color-stop-bg)] text-[var(--color-stop)] border-[var(--color-stop)]',
    border: 'border-[var(--color-stop)]',
  },
}

// ─── skeleton ─────────────────────────────────────────────────────────────────

function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${i === 0 ? 'w-2/3' : i % 2 === 0 ? 'w-full' : 'w-5/6'}`} />
      ))}
    </div>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function Result() {
  const { keyword = '' } = useParams<{ keyword: string }>()
  const navigate = useNavigate()
  const [data, setData]       = useState<TrendResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!keyword) return
    setLoading(true)
    setData(null)

    fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: decodeURIComponent(keyword) }),
    })
      .then((r) => r.json())
      .then((json: unknown) => {
        const d = json as TrendResult
        if ('error' in (json as object)) throw new Error((json as { error: string }).error)
        setData(d)
      })
      .catch((e: Error) => {
        toast.error(e.message, { description: '키워드를 확인하거나 잠시 후 다시 시도해주세요.', duration: 5000 })
      })
      .finally(() => setLoading(false))
  }, [keyword])

  const vc = data ? VERDICT_CONFIG[data.verdict] : null
  const decodedKeyword = decodeURIComponent(keyword)

  return (
    <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-4 sm:gap-5">

      {/* 뒤로 + 키워드 헤더 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          ← 홈
        </button>
        <Separator orientation="vertical" className="h-4" />
        <span className="font-semibold text-sm">{decodedKeyword}</span>
        {data && (
          <Badge variant="outline" className="font-mono text-xs ml-auto">
            {data.stage === 'rising' ? '↑ 상승기' :
             data.stage === 'peak'   ? '▲ 정점'  :
             data.stage === 'declining' ? '↓ 하락기' : '— 안정기'}
          </Badge>
        )}
      </div>

      {/* F1/F2 — 판정 카드 */}
      <Card className={vc ? `border-l-4 ${vc.border}` : ''}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base font-semibold">진입 판정</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <CardSkeleton lines={5} />
          ) : vc && data ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="outline" className={`text-base sm:text-lg font-mono font-bold px-4 py-1.5 ${vc.badge}`}>
                  {vc.label}
                </Badge>
                <span className="font-medium text-sm sm:text-base">{vc.sub}</span>
              </div>
              <Separator />
              <p className="text-sm text-muted-foreground">{vc.desc}</p>
              {data.exitWeek && (
                <div className="flex items-center gap-2 text-xs font-mono bg-[var(--color-stop-bg)] text-[var(--color-stop)] rounded-lg px-3 py-2 self-start">
                  ⚠ 약 <strong>{data.exitWeek}주 후</strong> 검색량 50% 이하 예상
                </div>
              )}
              {data.reasoning && (
                <>
                  <Separator />
                  <div className="bg-secondary rounded-xl p-3 sm:p-4">
                    <p className="text-[10px] sm:text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">AI 분석</p>
                    <p className="text-xs sm:text-sm whitespace-pre-line leading-relaxed">{data.reasoning}</p>
                  </div>
                </>
              )}

              {/* GO/WAIT/STOP 3단 상태 표시 */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                {(['GO', 'WAIT', 'STOP'] as Verdict[]).map((v) => (
                  <div
                    key={v}
                    className={`rounded-lg px-2 sm:px-3 py-2 text-center border transition-all ${
                      data.verdict === v
                        ? VERDICT_CONFIG[v].badge + ' font-semibold'
                        : 'border-border text-muted-foreground'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full mx-auto mb-1 ${VERDICT_CONFIG[v].dot} ${data.verdict !== v ? 'opacity-30' : ''}`} />
                    {v}
                  </div>
                ))}
              </div>

              {/* 손익분기 바로가기 */}
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => navigate('/simulate', { state: { exitWeek: data.exitWeek } })}
              >
                손익분기 시뮬레이션 →
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">분석 중 오류가 발생했습니다.</p>
          )}
        </CardContent>
      </Card>

      {/* F3 — 트렌드 차트 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base font-semibold">검색량 트렌드</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col gap-3">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-[220px] w-full rounded-xl" />
            </div>
          ) : data ? (
            <TrendChart
              data={data.weeks}
              shoppingData={data.shoppingWeeks}
              keyword={data.keyword}
              stage={data.stage}
            />
          ) : (
            <div className="h-[200px] flex items-center justify-center">
              <p className="text-sm text-muted-foreground">데이터 없음</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* F4 — 지역 적합도 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base font-semibold">지역 적합도</CardTitle>
          <p className="text-xs sm:text-sm text-muted-foreground">
            지역별 인구 구조와 트렌드 단계를 결합해 도입 적합도를 분석합니다.
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex gap-2">
              <Skeleton className="h-9 flex-1 rounded-lg" />
              <Skeleton className="h-9 w-24 rounded-lg" />
            </div>
          ) : (
            <RegionPanel stage={data?.stage ?? null} />
          )}
        </CardContent>
      </Card>

      {/* 관련 사례 바로가기 */}
      {data && (
        <div className="border border-border rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-medium">유사 패턴 과거 사례</p>
            <p className="text-xs text-muted-foreground mt-0.5">같은 패턴으로 망한 메뉴들의 교훈</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/cases')}>
            사례 보기 →
          </Button>
        </div>
      )}

    </div>
  )
}
