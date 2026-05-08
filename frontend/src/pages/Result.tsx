import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import TrendChart from '@/components/TrendChart'
import RegionPanel from '@/components/RegionPanel'
import CountUp from '@/components/CountUp'
import { useAnalysis, type TrendResult, type Verdict } from '@/store/analysis'

const VERDICT_CONFIG: Record<Verdict, {
  label: string
  sub: string
  desc: string
  color: string
  bg: string
  emoji: string
}> = {
  GO: {
    label: 'GO',
    sub: '지금 도입 적기입니다',
    desc: '검색 트렌드가 상승 중입니다. 경쟁자보다 먼저 선점하세요.',
    color: 'var(--color-go)',
    bg:    'var(--color-go-bg)',
    emoji: '🟢',
  },
  WAIT: {
    label: 'WAIT',
    sub: '조금 더 지켜보세요',
    desc: '트렌드가 정점 또는 안정기입니다. 수익성을 먼저 검토하세요.',
    color: 'var(--color-wait)',
    bg:    'var(--color-wait-bg)',
    emoji: '🟡',
  },
  STOP: {
    label: 'STOP',
    sub: '진입 비추천입니다',
    desc: '검색 트렌드가 하락 중입니다. 재고 소진 계획을 먼저 세우세요.',
    color: 'var(--color-stop)',
    bg:    'var(--color-stop-bg)',
    emoji: '🔴',
  },
}

const STAGE_LABEL = {
  rising:    '↑ 상승기',
  peak:      '▲ 정점',
  declining: '↓ 하락기',
  stable:    '— 안정기',
}

// ─── section wrapper ─────────────────────────────────────────────────────────

function Section({
  index,
  children,
}: {
  index: number
  children: React.ReactNode
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="w-full"
    >
      {children}
    </motion.section>
  )
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function Result() {
  const { keyword = '' } = useParams<{ keyword: string }>()
  const navigate = useNavigate()
  const { getCached, setCached } = useAnalysis()

  const decoded = decodeURIComponent(keyword)
  const cached  = getCached(decoded)

  const [data, setData]       = useState<TrendResult | null>(cached)
  const [loading, setLoading] = useState(!cached)

  useEffect(() => {
    if (!keyword) return

    // 캐시 있으면 즉시 표시 — 백그라운드 갱신 없음
    if (cached) {
      setData(cached)
      setLoading(false)
      return
    }

    setLoading(true)
    setData(null)

    fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: decoded }),
    })
      .then(async (r) => {
        const json = await r.json()
        if (!r.ok) throw new Error((json as { error?: string }).error ?? `오류 ${r.status}`)
        return json as TrendResult
      })
      .then((d) => {
        setData(d)
        setCached(decoded, d)
      })
      .catch((e: Error) => {
        toast.error(e.message, {
          description: '키워드를 확인하거나 잠시 후 다시 시도해주세요.',
          duration: 5000,
        })
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword])

  return (
    <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10 flex flex-col gap-5 sm:gap-6">

      {/* 뒤로 + 키워드 헤더 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-muted-foreground hover:text-foreground text-sm transition-colors flex items-center gap-1"
        >
          ← 홈
        </button>
        <span className="text-muted-foreground text-sm">·</span>
        <span className="font-semibold text-sm">{decoded}</span>
        {data && !loading && (
          <Badge variant="outline" className="font-mono text-[10px] ml-auto">
            {STAGE_LABEL[data.stage]}
          </Badge>
        )}
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-5"
          >
            <Skeleton className="h-64 w-full rounded-3xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-72 w-full rounded-2xl" />
            <Skeleton className="h-72 w-full rounded-2xl" />
          </motion.div>
        ) : data ? (
          <motion.div
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-5 sm:gap-6"
          >
            <VerdictHero data={data} />
            <Section index={1}><MetricsRow data={data} /></Section>
            <Section index={2}><AIReasoning data={data} /></Section>
            <Section index={3}><TrendBlock data={data} /></Section>
            <Section index={4}><RegionBlock stage={data.stage} /></Section>
            <Section index={5}><SimulatorCTA exitWeek={data.exitWeek} navigate={navigate} /></Section>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

// ─── 1. Verdict Hero (빅 판정) ────────────────────────────────────────────────

function VerdictHero({ data }: { data: TrendResult }) {
  const v = VERDICT_CONFIG[data.verdict]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-3xl p-6 sm:p-8 overflow-hidden border"
      style={{ backgroundColor: v.bg, borderColor: v.color }}
    >
      {/* 큰 워터마크 글자 */}
      <div
        className="absolute -right-6 -top-2 text-[140px] sm:text-[180px] font-black leading-none opacity-[0.06] pointer-events-none select-none font-mono"
        style={{ color: v.color }}
      >
        {v.label}
      </div>

      <div className="relative flex flex-col gap-3">
        <span className="text-xs font-medium uppercase tracking-widest" style={{ color: v.color }}>
          진단 결과
        </span>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="font-mono font-black text-5xl sm:text-7xl tracking-tight"
          style={{ color: v.color }}
        >
          {v.label}
        </motion.div>

        <p className="font-semibold text-base sm:text-lg mt-1">{v.sub}</p>
        <p className="text-sm text-muted-foreground max-w-md leading-relaxed">{v.desc}</p>

        {data.exitWeek && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mt-2 inline-flex items-center gap-2 self-start text-xs font-mono bg-background/60 backdrop-blur rounded-lg px-3 py-2 border"
            style={{ borderColor: v.color, color: v.color }}
          >
            ⚠ 약 <strong>
              <CountUp to={data.exitWeek} duration={900} />
            </strong>주 후 검색량 50% 이하 예상
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

// ─── 2. Metrics Row (핵심 수치 4개) ──────────────────────────────────────────

function MetricsRow({ data }: { data: TrendResult }) {
  const items = [
    { label: '현재 검색량',  value: data.currentRatio, suffix: '' },
    { label: '최고점',        value: data.peakRatio,    suffix: '' },
    { label: '4주 평균',      value: data.avgRecent,    suffix: '' },
    {
      label: 'EXIT 예상',
      value: data.exitWeek ?? 0,
      suffix: data.exitWeek ? '주' : '',
      placeholder: !data.exitWeek ? '—' : undefined,
    },
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map((m) => (
        <div key={m.label} className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-1.5">
          <span className="text-[11px] text-muted-foreground">{m.label}</span>
          {m.placeholder ? (
            <span className="font-mono font-bold text-2xl text-muted-foreground">{m.placeholder}</span>
          ) : (
            <span className="font-mono font-bold text-2xl">
              <CountUp to={m.value} duration={1000} />{m.suffix}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── 3. AI 분석 ──────────────────────────────────────────────────────────────

function AIReasoning({ data }: { data: TrendResult }) {
  if (!data.reasoning) return null
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">✨</span>
        <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          AI 분석
        </span>
      </div>
      <p className="text-sm whitespace-pre-line leading-relaxed">{data.reasoning}</p>
    </div>
  )
}

// ─── 4. Trend ────────────────────────────────────────────────────────────────

function TrendBlock({ data }: { data: TrendResult }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">검색량 트렌드</h3>
        <span className="text-[11px] text-muted-foreground font-mono">
          {data.startDate} ~ {data.endDate}
        </span>
      </div>
      <TrendChart
        data={data.weeks}
        shoppingData={data.shoppingWeeks}
        keyword={data.keyword}
        stage={data.stage}
      />
    </div>
  )
}

// ─── 5. Region ───────────────────────────────────────────────────────────────

function RegionBlock({ stage }: { stage: TrendResult['stage'] }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="mb-4">
        <h3 className="font-semibold text-sm">지역 적합도</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          지역별 인구 구조와 트렌드 단계를 결합해 적합도를 분석합니다
        </p>
      </div>
      <RegionPanel stage={stage} />
    </div>
  )
}

// ─── 6. Simulator CTA ────────────────────────────────────────────────────────

function SimulatorCTA({
  exitWeek, navigate,
}: {
  exitWeek: number | null
  navigate: ReturnType<typeof useNavigate>
}) {
  return (
    <div className="bg-foreground text-background rounded-2xl p-5 sm:p-6 flex items-center justify-between gap-4 flex-wrap">
      <div>
        <p className="font-semibold text-sm sm:text-base">손익분기는 언제?</p>
        <p className="text-xs text-background/60 mt-0.5">
          {exitWeek
            ? `EXIT 예상 ${exitWeek}주 안에 얼마나 벌 수 있는지 계산해보세요.`
            : '재료비·판매가를 입력하면 손익분기 시점을 계산합니다.'}
        </p>
      </div>
      <Button
        variant="secondary"
        onClick={() => navigate('/simulate', { state: { exitWeek } })}
        className="bg-background text-foreground hover:bg-background/90 shrink-0"
      >
        시뮬레이터 →
      </Button>
    </div>
  )
}
