import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, Clock, Sparkles } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

type RecItem = {
  keyword: string
  verdict: string
  nature: string
  cycle: string
  riskScore: number
  confidence: number
  isSeasonal: boolean
  seasonPhase?: string
}

type ApiResponse = {
  items: RecItem[]
  ready: boolean
  updatedAt?: number
}

const CYCLE_LABEL: Record<string, string> = {
  EMERGING:  '떠오르는',
  RISING:    '상승 중',
  GROWING:   '꾸준 성장',
  PEAK:      '정점',
  STABLE:    '안정',
  SATURATED: '포화',
  DECLINING: '하락',
  FADED:     '한물감',
}

const VERDICT_COLOR: Record<string, string> = {
  GO:   'var(--color-go)',
  WAIT: 'var(--color-wait)',
  STOP: 'var(--color-stop)',
}

export default function RecommendedSection() {
  const navigate = useNavigate()
  const [items, setItems]     = useState<RecItem[] | null>(null)
  const [ready, setReady]     = useState(false)
  const [loading, setLoading] = useState(true)
  const [retries, setRetries] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const r = await fetch('/api/recommendations')
        const d = await r.json() as ApiResponse
        if (cancelled) return

        if (d.ready && d.items.length > 0) {
          setItems(d.items)
          setReady(true)
          setLoading(false)
        } else {
          // 아직 분석 중 — 10초 후 재시도 (최대 6회 = 1분)
          if (retries < 6) {
            setTimeout(() => setRetries(n => n + 1), 10_000)
          } else {
            setLoading(false)
          }
        }
      } catch {
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [retries])

  return (
    <section className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-16">
      {/* 헤더 */}
      <div className="flex items-baseline justify-between mb-6 flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <Sparkles className="w-3.5 h-3.5 text-[var(--color-go)]" strokeWidth={2} />
            <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              알고리즘 추천
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-semibold">
            지금 진입하기 좋은 메뉴
          </h2>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {ready ? 'ExEAT 알고리즘 검증 완료' : '분석 중…'}
        </span>
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            알고리즘이 후보 메뉴를 분석 중입니다 (최대 1분)…
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      )}

      {/* 결과 */}
      {!loading && ready && items && items.length > 0 && (
        <div className="flex flex-col gap-2">
          {items.slice(0, 5).map((item, i) => {
            const verdictColor = VERDICT_COLOR[item.verdict] ?? '#888'
            const cycleLabel   = CYCLE_LABEL[item.cycle] ?? item.cycle
            return (
              <motion.button
                key={item.keyword}
                type="button"
                onClick={() => navigate(`/result/${encodeURIComponent(item.keyword)}`)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: i * 0.07 }}
                whileHover={{ x: 3 }}
                className="fluent-card rounded-2xl p-4 text-left flex items-center gap-4"
              >
                {/* 순번 */}
                <span className="font-mono text-muted-foreground text-xs w-5 shrink-0 text-center">
                  {i + 1}
                </span>

                {/* 이름 + 배지 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-sm">{item.keyword}</span>
                    {item.isSeasonal && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-[var(--color-wait)] border-[var(--color-wait)]">
                        계절
                      </Badge>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {item.nature === 'TREND' ? '트렌드' : '스테디'} · {cycleLabel}
                  </span>
                </div>

                {/* 위험도 */}
                <div className="text-right shrink-0">
                  <div className="text-[10px] text-muted-foreground mb-0.5">위험도</div>
                  <span className="font-mono text-xs">{item.riskScore}</span>
                </div>

                {/* GO 뱃지 */}
                <div
                  className="shrink-0 flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ color: verdictColor, backgroundColor: verdictColor + '15' }}
                >
                  <CheckCircle2 className="w-3 h-3" strokeWidth={2.5} />
                  {item.verdict}
                </div>
              </motion.button>
            )
          })}
        </div>
      )}

      {/* 분석 완료됐는데 결과 없음 */}
      {!loading && (!ready || !items?.length) && (
        <p className="text-sm text-muted-foreground text-center py-8">
          추천 메뉴를 불러오지 못했습니다.
        </p>
      )}
    </section>
  )
}
