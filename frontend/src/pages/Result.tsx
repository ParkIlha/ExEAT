import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  AlertTriangle, Check, Heart, Newspaper, Minus, Info, Activity,
  BarChart3, Brain, Target, TrendingUp, Zap, Star, Snowflake, Leaf,
  Flame, ShieldCheck, ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import TrendChart from '@/components/TrendChart'
import RecommendedRegions from '@/components/RecommendedRegions'
import CountUp from '@/components/CountUp'
import ROICard from '@/components/ROICard'
import { useAnalysis, type TrendResult, type Verdict, type DivergenceType } from '@/store/analysis'
import { useAuth } from '@/store/auth'

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

const AI_PROVIDER_META: Record<string, { label: string; color: string }> = {
  claude:    { label: 'Claude',     color: '#cc785c' },
  gemini:    { label: 'Gemini',     color: '#4285f4' },
  algorithm: { label: '알고리즘',    color: '#888888' },
  unknown:   { label: '?',          color: '#888888' },
}

type ItemTypeMeta = { label: string; color: string; desc: string; Icon: typeof Flame }
const ITEM_TYPE_META: Record<string, ItemTypeMeta> = {
  trending:          { label: '폭발 상승',     Icon: Flame,       color: 'var(--color-stop)', desc: '요즘 검색이 가속 중인 트렌딩 메뉴' },
  growing:           { label: '점진 성장',     Icon: TrendingUp,  color: 'var(--color-go)',   desc: '점진적으로 우상향 중' },
  classic:           { label: '클래식',       Icon: Star,        color: 'var(--color-go)',   desc: '오래 안정적, 충성 수요 보유' },
  seasonal:          { label: '계절성',       Icon: Snowflake,   color: 'var(--color-wait)', desc: '시기에 따라 변동이 큼' },
  fading:            { label: '한물감',       Icon: Activity,    color: 'var(--color-stop)', desc: '정점 지나고 하락 단계' },
  niche:             { label: '틈새',         Icon: Target,      color: '#888',              desc: '검색량 작지만 안정적' },
  stable:            { label: '정체',         Icon: Minus,       color: '#888',              desc: '큰 방향성 없음' },
  steady_saturated:  { label: '스테디·포화',  Icon: Zap,         color: '#7c3aed',           desc: '치킨·커피 수준 — 시장 포화, 경쟁 매우 치열' },
  steady_safe:       { label: '스테디·안정',  Icon: ShieldCheck, color: 'var(--color-go)',   desc: '안정 수요 확보, 차별화 여지 있는 스테디' },
  steady_emerging:   { label: '스테디·안착',  Icon: Leaf,        color: '#0891b2',           desc: '유행 후 자리잡은 메뉴 (베이글·크로플 등)' },
}

// ─── section wrapper ─────────────────────────────────────────────────────────

// ─── 분석중 로딩 화면 ─────────────────────────────────────────────────────────

const LOADING_STEPS = [
  { label: '네이버 DataLab 데이터 수집 중', sub: '12주 검색량 + 쇼핑 클릭 불러오는 중...', duration: 2000 },
  { label: '블로그·뉴스·구글 신호 분석 중', sub: 'UGC 버즈 · 미디어 노출 · 글로벌 트렌드 교차 중...', duration: 2500 },
  { label: '수명주기 & 위험도 계산 중', sub: 'Prophet 예측 · 변곡점 · 위험도 산출 중...', duration: 2000 },
  { label: 'AI가 진단 리포트 작성 중', sub: 'Gemini가 데이터 해석 + 액션 플랜 생성 중...', duration: 0 },
]

function AnalyzingScreen({ keyword }: { keyword: string }) {
  const [stepIdx, setStepIdx] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function advance(idx: number) {
      const step = LOADING_STEPS[idx]
      if (!step || step.duration === 0) return
      timerRef.current = setTimeout(() => {
        setStepIdx((prev) => {
          const next = Math.min(prev + 1, LOADING_STEPS.length - 1)
          advance(next)
          return next
        })
      }, step.duration)
    }
    advance(0)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  const step = LOADING_STEPS[stepIdx]

  return (
    <motion.div
      key="analyzing"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center py-24 gap-8"
    >
      {/* 로고 + 펄스 */}
      <div className="relative">
        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <img src="/logo.png" alt="ExEAT" className="w-16 h-16 object-contain" />
        </motion.div>
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(45,122,79,0.15) 0%, transparent 70%)' }}
          animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* 키워드 */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground mb-1">분석 중</p>
        <p className="text-xl font-bold tracking-tight">"{keyword}"</p>
      </div>

      {/* 스텝 */}
      <div className="w-full max-w-xs flex flex-col gap-2.5">
        {LOADING_STEPS.map((s, i) => {
          const done    = i < stepIdx
          const active  = i === stepIdx
          const pending = i > stepIdx
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: pending ? 0.3 : 1, x: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="flex items-start gap-3"
            >
              <div className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0">
                {done ? (
                  <motion.span
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="text-[var(--color-go)]"
                  >
                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                  </motion.span>
                ) : active ? (
                  <motion.div
                    className="w-3 h-3 rounded-full border-2 border-foreground border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                )}
              </div>
              <div>
                <p className={`text-xs font-medium ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {s.label}
                </p>
                {active && (
                  <motion.p
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-[10px] text-muted-foreground mt-0.5"
                  >
                    {s.sub}
                  </motion.p>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}

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
  const { getCached, setCached, userProfile } = useAnalysis()
  const recordSearch = useAuth((s) => s.recordSearch)

  const decoded = decodeURIComponent(keyword)
  const cached  = getCached(decoded)

  const [data, setData]       = useState<TrendResult | null>(cached)
  const [loading, setLoading] = useState(!cached)

  useEffect(() => {
    if (!keyword) return
    if (cached) {
      setData(cached)
      setLoading(false)
      // 캐시 히트 시에도 "내 분석" 이력은 남겨야 함
      recordSearch(decoded, cached.verdict)
      return
    }
    setLoading(true); setData(null)

    fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyword: decoded,
        userProfile: userProfile ?? undefined,
      }),
    })
      .then(async (r) => {
        const json = await r.json()
        if (!r.ok) throw new Error((json as { error?: string }).error ?? `오류 ${r.status}`)
        return json as TrendResult
      })
      .then((d) => {
        setData(d)
        setCached(decoded, d)
        recordSearch(decoded, d.verdict)
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

  const [activeTab, setActiveTab] = useState<'data' | 'ai' | 'plan'>('data')

  const TABS = [
    { id: 'data' as const, label: '데이터',     Icon: BarChart3 },
    { id: 'ai'   as const, label: 'AI 분석',    Icon: Brain },
    { id: 'plan' as const, label: '액션 플랜',  Icon: Target },
  ]

  return (
    <div className="w-full px-4 sm:px-6 py-6">
      {/* 상단 브레드크럼 */}
      <div className="max-w-6xl mx-auto flex items-center gap-2 mb-6">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-muted-foreground hover:text-foreground text-sm transition-colors flex items-center gap-1"
        >
          ← 홈
        </button>
        <span className="text-muted-foreground text-sm">/</span>
        <span className="font-semibold text-sm">{decoded}</span>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <AnalyzingScreen keyword={decoded} />
        ) : data ? (
          <motion.div
            key="result"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="max-w-6xl mx-auto"
          >
            {/* ─── 2단 레이아웃 ─── */}
            <div className="flex flex-col lg:flex-row gap-5 lg:gap-6 lg:items-start">

              {/* ══ 좌측: 판정 패널 (데스크탑 sticky) ══ */}
              <div className="w-full lg:w-80 xl:w-88 shrink-0 lg:sticky lg:top-20">
                <VerdictPanel data={data} />
              </div>

              {/* ══ 우측: 탭 콘텐츠 ══ */}
              <div className="flex-1 min-w-0 flex flex-col gap-4">
                {/* 탭 네비게이션 */}
                <div className="flex gap-1 p-1 fluent-card rounded-xl">
                  {TABS.map((tab) => {
                    const Icon = tab.Icon
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all inline-flex items-center justify-center gap-1.5 ${
                          activeTab === tab.id
                            ? 'bg-foreground text-background shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                        {tab.label}
                      </button>
                    )
                  })}
                </div>

                {/* 탭 콘텐츠 */}
                <AnimatePresence mode="wait">
                  {activeTab === 'data' && (
                    <motion.div
                      key="data"
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="flex flex-col gap-4"
                    >
                      <Section index={0}><SignalCard data={data} /></Section>
                      <Section index={1}><TrendBlock data={data} /></Section>
                      <Section index={2}><MetricsRow data={data} /></Section>
                      <Section index={3}><RegionBlock stage={data.stage} /></Section>
                    </motion.div>
                  )}
                  {activeTab === 'ai' && (
                    <motion.div
                      key="ai"
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="flex flex-col gap-4"
                    >
                      <Section index={0}><ItemTypeCard data={data} /></Section>
                      {data.saturationScore != null && <Section index={1}><SaturationCard data={data} /></Section>}
                      <Section index={2}><DataInsightCard data={data} /></Section>
                      <Section index={3}><MarketContextCard data={data} /></Section>
                      <Section index={4}><RiskGauge data={data} /></Section>
                    </motion.div>
                  )}
                  {activeTab === 'plan' && (
                    <motion.div
                      key="plan"
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="flex flex-col gap-4"
                    >
                      <Section index={0}>
                        <ROICard exitWeek={data.exitWeek} verdict={data.verdict} keyword={data.keyword} />
                      </Section>
                      <Section index={1}><ActionPlanCard data={data} /></Section>
                      <Section index={2}><WorstCaseCard data={data} /></Section>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

// ─── 0. Verdict Panel (좌측 고정) ────────────────────────────────────────────

function VerdictPanel({ data }: { data: TrendResult }) {
  const v = VERDICT_CONFIG[data.verdict]
  const itemMeta = data.itemType ? ITEM_TYPE_META[data.itemType] : null
  // aiProvider에 ' (cached)' 같은 접미사가 붙을 수 있으므로 첫 단어만 추출
  const providerKey = (data.aiProvider ?? 'unknown').split(' ')[0]
  const aiMeta = AI_PROVIDER_META[providerKey] ?? AI_PROVIDER_META['unknown']
  const isAlgorithmFallback = providerKey === 'algorithm'

  // 빠른 ROI 미리보기 (카페 음료 기본값 가정)
  // 사용자가 "액션 플랜" 탭 안 눌러도 가치 인식 가능하게
  const ew = data.exitWeek ?? 12
  const quickRevenue = 7000 * 0.65 * 40 * 7 * ew  // 음료 7천원 × 65% 마진 × 40잔 × 7일 × EXIT주
  const quickNet     = quickRevenue - 1500000     // 초기투자 150만 차감

  return (
    <div className="flex flex-col gap-3">
      {/* AI 폴백 알림 (Gemini 실패 시) */}
      {isAlgorithmFallback && (
        <div className="text-[10px] text-[var(--color-wait)] bg-[var(--color-wait-bg)] border border-[var(--color-wait)]/30 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
          <Info className="w-3 h-3 shrink-0" />
          <span>AI 응답 지연 — 알고리즘 분석 결과를 표시합니다 (정확도 동일)</span>
        </div>
      )}

      {/* 메인 판정 카드 */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative rounded-2xl p-5 overflow-hidden border"
        style={{
          backgroundColor: v.bg,
          borderColor: v.color + '55',
          boxShadow: data.verdict === 'GO' ? 'var(--glow-go)' : data.verdict === 'STOP' ? 'var(--glow-stop)' : 'var(--glow-wait)',
        }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 0% 0%, ${v.color}1a 0%, transparent 70%)` }} />
        <div className="absolute -right-3 -top-2 text-[90px] font-black leading-none opacity-[0.07] pointer-events-none select-none font-mono" style={{ color: v.color }}>{v.label}</div>

        <div className="relative flex flex-col gap-2">
          <span className="text-[10px] font-medium uppercase tracking-widest" style={{ color: v.color }}>진단 결과</span>
          <div className="font-mono font-black text-4xl tracking-tight" style={{ color: v.color }}>{v.label}</div>
          <p className="font-semibold text-sm">{v.sub}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{data.summary || v.desc}</p>

          {data.exitWeek && (
            <div
              className="mt-1 inline-flex items-center gap-1.5 self-start text-[11px] font-mono rounded-lg px-2.5 py-1.5 border"
              style={{ borderColor: v.color + '60', color: v.color, background: v.color + '0e' }}
            >
              <AlertTriangle className="w-3 h-3" strokeWidth={2.5} />
              <strong><CountUp to={data.exitWeek} duration={900} /></strong>주 후 50% 이하
            </div>
          )}

          {/* 빠른 수익 미리보기 — Gemini가 줄 수 없는 답 */}
          {quickNet > 0 && data.verdict !== 'STOP' && (
            <div className="mt-3 pt-3 border-t border-foreground/8">
              <p className="text-[10px] text-muted-foreground mb-1">예상 수익 미리보기 · 카페 기본값</p>
              <p className="text-sm font-bold">
                EXIT까지 약 <span className="font-mono" style={{ color: v.color }}>
                  {quickNet >= 10000 ? `${(quickNet / 10000).toFixed(0)}만원` : `${Math.round(quickNet).toLocaleString()}원`}
                </span>
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                액션 플랜 탭에서 내 가게 숫자로 정확히 계산
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* 빠른 지표 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="fluent-card rounded-2xl p-4 flex flex-col gap-3"
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-muted-foreground">위험도</span>
            <span className="font-mono font-bold text-lg"><CountUp to={data.riskScore ?? 0} /><span className="text-xs font-normal text-muted-foreground">/100</span></span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-muted-foreground">단계</span>
            <span className="font-mono font-bold text-sm">{STAGE_LABEL[data.stage]}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-muted-foreground">평균 검색량</span>
            <span className="font-mono font-bold text-lg"><CountUp to={data.avgAll ?? 0} decimals={1} /></span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-muted-foreground">모멘텀</span>
            <span className={`font-mono font-bold text-sm ${(data.momentum ?? 0) > 0 ? 'text-[var(--color-go)]' : 'text-[var(--color-stop)]'}`}>
              {(data.momentum ?? 0) > 0 ? '+' : ''}{data.momentum ?? 0}
            </span>
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-1.5">
          {itemMeta && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">메뉴 유형</span>
              <span className="text-[11px] font-semibold inline-flex items-center gap-1" style={{ color: itemMeta.color }}>
                <itemMeta.Icon className="w-3 h-3" strokeWidth={2.2} />
                {itemMeta.label}
              </span>
            </div>
          )}
          {data.peakDecay != null && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">정점 대비</span>
              <span className="text-[11px] font-mono">
                {data.peakDecay > 0 ? '−' : ''}{Math.round(data.peakDecay * 100)}%
              </span>
            </div>
          )}
          {data.signalDivergence?.type && data.signalDivergence.type !== 'neutral' && (() => {
            const dt = data.signalDivergence.type
            const map = {
              bubble:       { Icon: AlertTriangle, label: '거품 가능성',  color: 'var(--color-stop)' },
              confirmed:    { Icon: Check,         label: '실수요 확인',  color: 'var(--color-go)' },
              loyal:        { Icon: Heart,         label: '충성층 존재',  color: 'var(--color-wait)' },
              media_driven: { Icon: Newspaper,     label: '미디어 주도',  color: '#f59e0b' },
            } as const
            const m = (map as Record<string, { Icon: typeof Check; label: string; color: string } | undefined>)[dt]
            if (!m) return null
            return (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">시그널</span>
                <span className="text-[11px] font-medium inline-flex items-center gap-1" style={{ color: m.color }}>
                  <m.Icon className="w-3 h-3" strokeWidth={2.5} />
                  {m.label}
                </span>
              </div>
            )
          })()}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">분석</span>
            <span className="text-[10px] font-mono" style={{ color: aiMeta.color }}>{aiMeta.label}</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ─── 스테디 포화도 카드 ──────────────────────────────────────────────────────

function SaturationCard({ data }: { data: TrendResult }) {
  const score = data.saturationScore ?? 0
  const difficulty = data.differentiationDifficulty ?? '보통'
  const entryVerdict = data.entryVerdict ?? 'POSSIBLE'

  const entryColor = entryVerdict === 'CAUTION' ? 'var(--color-stop)'
    : entryVerdict === 'VIABLE' ? 'var(--color-go)'
    : 'var(--color-wait)'

  const entryLabel = entryVerdict === 'CAUTION' ? '진입 주의' : entryVerdict === 'VIABLE' ? '진입 가능' : '차별화 필요'

  const isSteady = data.itemType?.startsWith('steady')
  const typeDesc = data.itemType === 'steady_saturated'
    ? '치킨·커피처럼 이미 포화된 시장입니다. 브랜딩·위치·가격이 핵심 무기입니다.'
    : data.itemType === 'steady_emerging'
    ? '유행 이후 안착 단계입니다. 시그니처화로 고정 고객층을 확보할 수 있습니다.'
    : '안정적 수요가 있는 스테디 메뉴입니다. 차별화 포인트 1개로 충분히 경쟁 가능합니다.'

  return (
    <div className="fluent-card rounded-2xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-sm mb-0.5">스테디 시장 분석</h3>
          <p className="text-[11px] text-muted-foreground">포화도 · 경쟁 강도 · 진입 전략</p>
        </div>
        <div
          className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
          style={{ backgroundColor: entryColor + '18', color: entryColor }}
        >
          {entryLabel}
        </div>
      </div>

      <div className="flex flex-col gap-3 mb-4">
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">시장 포화도</span>
            <span className="font-mono font-bold"><CountUp to={score} /><span className="text-muted-foreground">/100</span></span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: score >= 70 ? 'var(--color-stop)' : score >= 45 ? 'var(--color-wait)' : 'var(--color-go)' }}
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
        </div>

        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">차별화 난이도</span>
          <span className="font-semibold">{difficulty}</span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed border-t border-border pt-3">
        {typeDesc}
      </p>
    </div>
  )
}

// ─── 1. Verdict Hero (모바일용 유지) ─────────────────────────────────────────

function VerdictHero({ data }: { data: TrendResult }) {
  const v = VERDICT_CONFIG[data.verdict]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-3xl p-6 sm:p-8 overflow-hidden border"
      style={{
        backgroundColor: v.bg,
        borderColor: v.color + '55',
        boxShadow: data.verdict === 'GO' ? 'var(--glow-go)' : data.verdict === 'STOP' ? 'var(--glow-stop)' : 'var(--glow-wait)',
      }}
    >
      {/* Fluent 상단 광원 효과 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 20% 0%, ${v.color}22 0%, transparent 60%)`,
        }}
      />
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
            <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2.5} />
            약 <strong><CountUp to={data.exitWeek} duration={900} /></strong>주 후 검색량 50% 이하 예상
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
    <div className="fluent-card rounded-2xl p-5">
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
        <div key={m.label} className="fluent-card rounded-2xl p-4 flex flex-col gap-1.5">
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
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: meta.color + '22' }}
      >
        <meta.Icon className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={1.8} style={{ color: meta.color }} />
      </div>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-[11px] font-medium uppercase tracking-widest" style={{ color: meta.color }}>
          메뉴 본질
        </span>
        <span className="font-semibold text-base">{meta.label}</span>
        <span className="text-xs text-muted-foreground">{meta.desc}</span>
      </div>
    </div>
  )
}

// ─── Data Insight ────────────────────────────────────────────────────────────

function DataInsightCard({ data }: { data: TrendResult }) {
  const insight = data.dataInsight || data.reasoning
  if (!insight) return null
  const providerRaw = data.aiProvider ?? 'unknown'
  const provider = providerRaw.split(' ')[0]
  const meta = AI_PROVIDER_META[provider] ?? AI_PROVIDER_META['unknown']
  return (
    <div className="fluent-card rounded-2xl p-5">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
          <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            데이터 인사이트
          </span>
        </div>
        <span
          className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
          style={{ color: meta.color, borderColor: meta.color + '55' }}
          title={`${provider} 가 분석을 생성했습니다`}
        >
          by {meta.label}
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
    <div className="fluent-card rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
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
        <AlertTriangle className="w-4 h-4 text-[var(--color-stop)]" strokeWidth={2.2} />
        <span className="text-[11px] font-medium uppercase tracking-widest text-[var(--color-stop)]">
          최악의 시나리오
        </span>
      </div>
      <p className="text-sm leading-relaxed">{wc}</p>
    </div>
  )
}

// ─── 7. Signal Card ──────────────────────────────────────────────────────────

const DIVERGENCE_CONFIG: Record<DivergenceType, { label: string; desc: string; color: string; Icon: typeof Check }> = {
  bubble:       { label: '거품 경보',   desc: '검색 관심도는 높지만 실구매 시그널이 약합니다. 단순 유행일 가능성이 있습니다.', color: '#ef4444',           Icon: AlertTriangle },
  confirmed:    { label: '실수요 확인', desc: '검색량·쇼핑클릭·블로그 버즈가 모두 일치합니다. 실제 소비가 뒷받침된 트렌드입니다.', color: 'var(--color-go)',   Icon: Check },
  loyal:        { label: '충성층 존재', desc: '검색량은 줄었지만 블로그 콘텐츠가 활발합니다. 고정 팬층이 있는 메뉴입니다.', color: 'var(--color-wait)', Icon: Heart },
  media_driven: { label: '미디어 주도', desc: '뉴스 노출은 많지만 UGC가 적습니다. 미디어 과대 포장일 수 있습니다.', color: '#f59e0b',           Icon: Newspaper },
  neutral:      { label: '신호 중립',   desc: '신호 간 뚜렷한 불일치 없음. 종합 판정을 참고하세요.', color: '#888',              Icon: Minus },
}

function SignalBar({ label, level, count, maxCount, color }: {
  label: string; level: 'high' | 'medium' | 'low' | null; count?: number; maxCount?: number; color: string
}) {
  const pct = maxCount && count ? Math.min(100, Math.round(Math.log10(count + 1) / Math.log10(maxCount + 1) * 100)) : null
  const levelLabel = level === 'high' ? '높음' : level === 'medium' ? '중간' : level === 'low' ? '낮음' : '—'
  const barPct = level === 'high' ? 90 : level === 'medium' ? 55 : level === 'low' ? 20 : 0

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium" style={{ color }}>
          {count != null ? count.toLocaleString() + '건' : levelLabel}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct ?? barPct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

function SignalCard({ data }: { data: TrendResult }) {
  const div = data.signalDivergence
  const divType: DivergenceType = div?.type ?? 'neutral'
  const cfg = DIVERGENCE_CONFIG[divType]

  // 네이버 검색량 현재 레벨
  const searchLevel = data.currentRatio >= 60 ? 'high' : data.currentRatio >= 30 ? 'medium' : 'low'
  const searchColor = data.stage === 'rising' ? 'var(--color-go)' : data.stage === 'declining' ? 'var(--color-stop)' : 'var(--color-wait)'

  const hasBlog  = !!data.blogData
  const hasNews  = !!data.newsData
  const hasShop  = !!(data.shoppingWeeks && data.shoppingWeeks.length > 0)
  const hasGoogle = !!(data.googleWeeks && data.googleWeeks.length > 0)

  // 쇼핑 레벨
  let shopLevel: 'high' | 'medium' | 'low' | null = null
  if (hasShop) {
    const avg = data.shoppingWeeks!.slice(-4).reduce((a, b) => a + b.ratio, 0) / 4
    shopLevel = avg >= 60 ? 'high' : avg >= 30 ? 'medium' : 'low'
  }

  if (!hasBlog && !hasNews && !hasGoogle) return null

  return (
    <div className="fluent-card rounded-2xl p-5">
      <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold text-sm mb-0.5">멀티 신호 비교</h3>
          <p className="text-[11px] text-muted-foreground">검색량 · 쇼핑 · 블로그 · 뉴스 · 구글 교차 분석</p>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{ backgroundColor: cfg.color + '18', color: cfg.color }}
        >
          <cfg.Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
          <span>{cfg.label}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 mb-4">
        <SignalBar label="네이버 검색량" level={searchLevel} count={undefined} color={searchColor} />
        {hasShop && <SignalBar label="쇼핑 클릭 (구매의향)" level={shopLevel} color="#6366f1" />}
        {hasBlog && (
          <SignalBar
            label="블로그 포스팅 (UGC 버즈)"
            level={data.blogData!.buzzLevel}
            count={data.blogData!.total}
            maxCount={200000}
            color="#10b981"
          />
        )}
        {hasNews && (
          <SignalBar
            label="뉴스 기사 (미디어 노출)"
            level={data.newsData!.mediaLevel}
            count={data.newsData!.total}
            maxCount={20000}
            color="#f59e0b"
          />
        )}
        {hasGoogle && (
          <SignalBar label="구글 트렌드 (글로벌 교차)" level={null} color="#f59e0b" />
        )}
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed border-t border-border pt-3">
        {cfg.desc}
      </p>
    </div>
  )
}

// ─── 8. Trend ────────────────────────────────────────────────────────────────

function TrendBlock({ data }: { data: TrendResult }) {
  return (
    <div className="fluent-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-semibold text-sm">트렌드 수명주기 분석</h3>
        <span className="text-[11px] text-muted-foreground font-mono">
          {data.startDate} ~ {data.endDate}
        </span>
      </div>
      <TrendChart
        data={data.weeks}
        shoppingData={data.shoppingWeeks}
        googleData={data.googleWeeks}
        forecast={data.forecast}
        inflectionWeek={data.inflectionWeek}
        keyword={data.keyword}
        stage={data.stage}
        peakRatio={data.peakRatio}
        riskScore={data.riskScore}
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
    <div className="fluent-card rounded-2xl p-5">
      <div className="mb-4">
        <h3 className="font-semibold text-sm">추천 지역 Top 5</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          트렌드 단계 + 인구 구조 기반으로 도입에 유리한 지역을 추천합니다
        </p>
      </div>
      <RecommendedRegions stage={stage} />
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
        className="bg-background text-foreground hover:bg-background/90 shrink-0 gap-1.5"
      >
        시뮬레이터 <ArrowRight className="w-3.5 h-3.5" />
      </Button>
    </div>
  )
}
