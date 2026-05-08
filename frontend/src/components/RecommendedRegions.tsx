import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

type RegionResult = {
  region: string
  score: number
  verdict: '적합' | '보통' | '부적합'
  reason: string
  total: number
  floating: string
}

interface Props {
  stage: 'rising' | 'peak' | 'declining' | 'stable' | null
}

const VERDICT_CONFIG = {
  '적합':   { color: 'var(--color-go)',   bg: 'var(--color-go-bg)',   icon: '✓' },
  '보통':   { color: 'var(--color-wait)', bg: 'var(--color-wait-bg)', icon: '△' },
  '부적합': { color: 'var(--color-stop)', bg: 'var(--color-stop-bg)', icon: '✗' },
}

const STAGE_CONTEXT: Record<string, string> = {
  rising:   '트렌드 상승기 — 20·30대 밀집 지역이 유리합니다',
  peak:     '정점 단계 — 유동인구 많은 지역에서 단기 수익 극대화',
  declining:'하락기 — 40·50대 충성 소비층이 있는 지역이 상대적으로 안정',
  stable:   '안정기 — 유동인구 + 중장년층 균형 지역 추천',
}

export default function RecommendedRegions({ stage }: Props) {
  const [list, setList] = useState<RegionResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!stage) return
    setLoading(true)
    fetch('/api/region/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage, topN: 5 }),
    })
      .then((r) => r.json())
      .then((data: RegionResult[]) => setList(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [stage])

  if (!stage) return null

  return (
    <div className="flex flex-col gap-3">
      {/* 단계별 컨텍스트 */}
      <p className="text-[11px] text-muted-foreground">{STAGE_CONTEXT[stage]}</p>

      {loading && (
        <div className="flex gap-2 flex-wrap">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 w-24 rounded-full bg-secondary animate-pulse" />
          ))}
        </div>
      )}

      {!loading && list.length > 0 && (
        <div className="flex flex-col gap-2">
          {list.map((r, i) => {
            const cfg = VERDICT_CONFIG[r.verdict] ?? VERDICT_CONFIG['보통']
            return (
              <motion.div
                key={r.region}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.07 }}
                className="flex items-center gap-3"
              >
                {/* 순위 */}
                <span className="text-[11px] font-mono text-muted-foreground w-4 shrink-0">
                  {i + 1}
                </span>

                {/* 지역명 + 판정 뱃지 */}
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <span className="font-medium text-sm truncate">{r.region}</span>
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ color: cfg.color, backgroundColor: cfg.bg }}
                  >
                    {cfg.icon} {r.verdict}
                  </span>
                </div>

                {/* 점수 바 */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-20 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${r.score}%` }}
                      transition={{ duration: 0.8, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: cfg.color }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">
                    {r.score}
                  </span>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* 인구 정보 출처 */}
      <p className="text-[10px] text-muted-foreground/60 mt-1">
        행정안전부 주민등록 인구통계 기반 · 연령 분포 + 유동인구 합산 점수
      </p>
    </div>
  )
}
