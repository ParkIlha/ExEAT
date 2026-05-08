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
  label: string; sub: string; desc: string; color: string; bg: string;
}> = {
  GO: {
    label: 'GO',
    sub: '지금 도입 적기입니다',
    desc: '검색 트렌드가 상승 중입니다. 경쟁자보다 먼저 선점하세요.',
    color: 'var(--color-go)', bg: 'var(--color-go-bg)',
  },
  WAIT: {
    label: 'WAIT',
    sub: '조금 더 지켜보세요',
    desc: '트렌드가 정점 또는 안정기입니다. 수익성을 먼저 검토하세요.',
    color: 'var(--color-wait)', bg: 'var(--color-wait-bg)',
  },
  STOP: {
    label: 'STOP',
    sub: '진입 비추천입니다',
    desc: '검색 트렌드가 하락 중입니다. 재고 소진 계획을 먼저 세우세요.',
    color: 'var(--color-stop)', bg: 'var(--color-stop-bg)',
  },
}

const STAGE_LABEL = {
  rising: '↑ 상승기', peak: '▲ 정점',
  declining: '↓ 하락기', stable: '— 안정기',
}

const ITEM_TYPE_META: Record<string, { label: string; color: string; desc: string }> = {
  trending: { label: '🔥 폭발 상승',  color: 'var(--color-stop)', desc: '요즘 검색이 가속 중인 트렌딩 메뉴' },
  growing:  { label: '↗ 점진 성장',   color: 'var(--color-go)',   desc: '점진적으로 우상향 중' },
  classic:  { label: '★ 클래식',     color: 'var(--color-go)',   desc: '오래 안정적, 충성 수요 보유' },
  seasonal: { label: '◇ 계절성',     color: 'var(--color-wait)', desc: '시기에 따라 변동이 큼' },
  fading:   { label: '↘ 한물감',     color: 'var(--color-stop)', desc: '정점 지나고 하락 단계' },
  niche:    { label: '◦ 틈새',       color: '#888',              desc: '검색량 작지만 안정적' },
  stable:   { label: '— 정체',       color: '#888',              desc: '큰 방향성 없음' },
}

// ─── section wrapper ─────────────────────────────────────────────────────────

function Section({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
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
    if (cached) {
      setData(cached); setLoading(false); return
    }
    setLoading(true); setData(null)

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
      .then((d) => { setData(d); setCached(decoded, d) })
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

      {/* 헤더 */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
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
          <div className="flex items-center gap-1.5 ml-auto flex-wrap">
            {data.itemType && ITEM_TYPE_META[data.itemType] && (
              <Badge
                variant="outline"
                className="text-[10px]"
                style={{
                  color: ITEM_TYPE_META[data.itemType].color,
                  borderColor: ITEM_TYPE_META[data.itemType].color,
                }}
              >
                {ITEM_TYPE_META[data.itemType].label}
              </Badge>
            )}
            <Badge variant="outline" className="font-mono text-[10px]">
              {STAGE_LABEL[data.stage]}
            </Badge>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col gap-5"
          >
            <Skeleton className="h-64 w-full rounded-3xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-72 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </motion.div>
        ) : data ? (
          <motion.div
            key="result"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col gap-5 sm:gap-6"
          >
            <VerdictHero data={data} />
            <Section index={1}><ItemTypeCard data={data} /></Section>
            <Section index={2}><RiskGauge data={data} /></Section>
            <Section index={3}><MetricsRow data={data} /></Section>
            <Section index={4}><DataInsightCard data={data} /></Section>
            <Section index={5}><MarketContextCard data={data} /></Section>
            <Section index={6}><ActionPlanCard data={data} /></Section>
            <Section index={7}><WorstCaseCard data={data} /></Section>
            <Section index={8}><TrendBlock data={data} /></Section>
            <Section index={9}><RegionBlock stage={data.stage} /></Section>
            <Section index={10}><SimulatorCTA exitWeek={data.exitWeek} navigate={navigate} /></Section>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

// ─── 1. Verdict Hero ─────────────────────────────────────────────────────────

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

        {/* AI 한 줄 요약이 있으면 우선 노출, 없으면 기본 desc */}
        <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
          {data.summary || v.desc}
        </p>

        {data.exitWeek && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mt-2 inline-flex items-center gap-2 self-start text-xs font-mono bg-background/60 backdrop-blur rounded-lg px-3 py-2 border"
            style={{ borderColor: v.color, color: v.color }}
          >
            ⚠ 약 <strong><CountUp to={data.exitWeek} duration={900} /></strong>주 후 검색량 50% 이하 예상
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

// ─── 2. Risk Gauge ───────────────────────────────────────────────────────────

function RiskGauge({ data }: { data: TrendResult }) {
  const score = data.riskScore ?? 50
  const color =
    score >= 70 ? 'var(--color-stop)' :
    score >= 40 ? 'var(--color-wait)' :
    'var(--color-go)'
  const label =
    score >= 70 ? '매우 높음' :
    score >= 40 ? '주의 필요' :
    '낮음'

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            종합 위험도
          </span>
          <Badge variant="outline" className="text-[10px]" style={{ color, borderColor: color }}>
            {label}
          </Badge>
        </div>
        <span className="font-mono text-2xl font-bold" style={{ color }}>
          <CountUp to={score} duration={1100} /><span className="text-sm text-muted-foreground">/100</span>
        </span>
      </div>

      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden relative">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>

      {/* 위험도 구성 요소 4개 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
        {[
          { label: '정점 대비 하락',  value: `${Math.round((data.peakDecay ?? 0) * 100)}%` },
          { label: '4주 평균 변화', value: `${(data.avgRecent - data.avgPrev > 0 ? '+' : '')}${(data.avgRecent - data.avgPrev).toFixed(0)}` },
          { label: '모멘텀',          value: (data.momentum ?? 0).toFixed(1) },
          { label: '변동성',          value: (data.volatility ?? 0).toFixed(1) },
        ].map((m) => (
          <div key={m.label} className="bg-secondary rounded-lg px-2 py-1.5 flex flex-col">
            <span className="text-[10px] text-muted-foreground">{m.label}</span>
            <span className="font-mono text-xs font-medium">{m.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── 3. Metrics Row ──────────────────────────────────────────────────────────

function MetricsRow({ data }: { data: TrendResult }) {
  const items = [
    { label: '현재 검색량', value: data.currentRatio, suffix: '' },
    { label: '최고점',       value: data.peakRatio,    suffix: '' },
    { label: '4주 평균',     value: data.avgRecent,    suffix: '' },
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

// ─── ItemType Card ───────────────────────────────────────────────────────────

function ItemTypeCard({ data }: { data: TrendResult }) {
  const it = data.itemType ?? 'stable'
  const meta = ITEM_TYPE_META[it] ?? ITEM_TYPE_META.stable
  return (
    <div
      className="rounded-2xl p-5 border flex items-center gap-4"
      style={{ borderColor: meta.color, backgroundColor: meta.color + '0d' }}
    >
      <div
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center text-2xl sm:text-3xl shrink-0"
        style={{ backgroundColor: meta.color + '22' }}
      >
        {meta.label.split(' ')[0]}
      </div>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-[11px] font-medium uppercase tracking-widest" style={{ color: meta.color }}>
          메뉴 본질
        </span>
        <span className="font-semibold text-base">{meta.label.split(' ').slice(1).join(' ')}</span>
        <span className="text-xs text-muted-foreground">{meta.desc}</span>
      </div>
    </div>
  )
}

// ─── Data Insight ────────────────────────────────────────────────────────────

function DataInsightCard({ data }: { data: TrendResult }) {
  const insight = data.dataInsight || data.reasoning
  if (!insight) return null
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">📊</span>
        <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          데이터 인사이트
        </span>
      </div>
      <p className="text-sm whitespace-pre-line leading-relaxed">{insight}</p>
    </div>
  )
}

// ─── Market Context ──────────────────────────────────────────────────────────

function MarketContextCard({ data }: { data: TrendResult }) {
  if (!data.marketContext) return null
  return (
    <div className="bg-secondary/60 border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">🌐</span>
        <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          시장 맥락
        </span>
      </div>
      <p className="text-sm whitespace-pre-line leading-relaxed">{data.marketContext}</p>
    </div>
  )
}

// ─── 5. Action Plan ──────────────────────────────────────────────────────────

function ActionPlanCard({ data }: { data: TrendResult }) {
  const ap = data.actionPlan
  if (!ap) return null

  const sections = [
    { key: 'immediate', label: '즉시 (1주 내)',   color: 'var(--color-stop)',  items: ap.immediate },
    { key: 'shortterm', label: '단기 (1개월 내)', color: 'var(--color-wait)',  items: ap.shortterm },
    { key: 'midterm',   label: '중기 (3개월 내)', color: 'var(--color-go)',    items: ap.midterm   },
  ].filter((s) => s.items && s.items.length > 0)

  if (!sections.length) return null

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base">🎯</span>
        <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          액션 플랜
        </span>
      </div>

      <div className="flex flex-col gap-5">
        {sections.map((s, idx) => (
          <motion.div
            key={s.key}
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: idx * 0.08 }}
            className="flex flex-col gap-2"
          >
            <div className="flex items-center gap-2">
              <span className="w-1 h-3 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-xs font-semibold" style={{ color: s.color }}>{s.label}</span>
            </div>
            <ul className="flex flex-col gap-1.5 ml-3">
              {s.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm leading-relaxed">
                  <span className="text-muted-foreground mt-0.5">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}

        {/* 대안 메뉴 */}
        {ap.alternatives && ap.alternatives.length > 0 && (
          <div className="border-t border-border pt-4 mt-1">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              대안 메뉴 후보
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ap.alternatives.map((alt) => (
                <Badge key={alt} variant="outline" className="text-xs">
                  {alt}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── 6. Worst Case ──────────────────────────────────────────────────────────

function WorstCaseCard({ data }: { data: TrendResult }) {
  const wc = data.actionPlan?.worstCase
  if (!wc) return null
  return (
    <div className="bg-[var(--color-stop-bg)] border border-[var(--color-stop)]/30 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">⚠</span>
        <span className="text-[11px] font-medium uppercase tracking-widest text-[var(--color-stop)]">
          최악의 시나리오
        </span>
      </div>
      <p className="text-sm leading-relaxed">{wc}</p>
    </div>
  )
}

// ─── 7. Trend ────────────────────────────────────────────────────────────────

function TrendBlock({ data }: { data: TrendResult }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-semibold text-sm">검색량 트렌드 + 4주 예측</h3>
        <span className="text-[11px] text-muted-foreground font-mono">
          {data.startDate} ~ {data.endDate}
        </span>
      </div>
      <TrendChart
        data={data.weeks}
        shoppingData={data.shoppingWeeks}
        forecast={data.forecast}
        inflectionWeek={data.inflectionWeek}
        keyword={data.keyword}
        stage={data.stage}
      />
      {data.inflectionWeek != null && data.weeks[data.inflectionWeek] && (
        <p className="text-[11px] text-muted-foreground mt-3">
          · 변곡점 <span className="font-mono">{data.weeks[data.inflectionWeek].period}</span>
          에서 추세가 전환되었습니다
        </p>
      )}
    </div>
  )
}

// ─── 8. Region ───────────────────────────────────────────────────────────────

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

// ─── 9. Simulator CTA ────────────────────────────────────────────────────────

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
