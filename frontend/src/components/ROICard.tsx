import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Check, TrendingUp } from 'lucide-react'
import CountUp from '@/components/CountUp'

interface Props {
  exitWeek: number | null
  verdict: string
  keyword: string
}

function fmt(n: number): string {
  if (Math.abs(n) >= 100000000) return `${(n / 100000000).toFixed(1)}억원`
  if (Math.abs(n) >= 10000)     return `${(n / 10000).toFixed(0)}만원`
  return `${Math.round(n).toLocaleString()}원`
}

const PRESETS = [
  { label: '카페·음료',   price: 6500,  margin: 68, daily: 60,  invest: 3000, fixed: 250 },
  { label: '디저트·베이커리', price: 5500, margin: 58, daily: 35, invest: 1500, fixed: 180 },
  { label: '분식·패스트푸드', price: 9000, margin: 52, daily: 50, invest: 2000, fixed: 220 },
  { label: '식사 메뉴',   price: 13000, margin: 45, daily: 40,  invest: 5000, fixed: 350 },
]

export default function ROICard({ exitWeek, verdict, keyword }: Props) {
  const [price,   setPrice]  = useState('6500')
  const [margin,  setMargin] = useState('68')
  const [daily,   setDaily]  = useState('60')
  const [invest,  setInvest] = useState('3000')
  const [fixed,   setFixed]  = useState('250')

  const result = useMemo(() => {
    const p   = Number(price)   || 0
    const m   = Number(margin)  || 0
    const d   = Number(daily)   || 0
    const iv  = (Number(invest) || 0) * 10000
    const fc  = (Number(fixed)  || 0) * 10000
    const ew  = exitWeek ?? 12

    const perItem       = p * (m / 100)
    const dailyProfit   = perItem * d
    const monthlyRev    = dailyProfit * 30
    const monthlyNet    = monthlyRev - fc
    const weeklyNet     = monthlyNet / 4.3
    const totalNet      = weeklyNet * ew - iv
    const roi           = iv > 0 ? (totalNet / iv) * 100 : 0
    const breakEvenMonth = monthlyNet > 0 ? Math.ceil(iv / monthlyNet) : null
    const breakEvenWeek  = breakEvenMonth != null ? Math.round(breakEvenMonth * 4.3) : null

    return {
      perItem, dailyProfit, monthlyRev, monthlyNet,
      weeklyNet, totalNet, roi,
      breakEvenMonth, breakEvenWeek,
      exitWeek: ew,
      isMarginalNeg: monthlyNet < 0,
    }
  }, [price, margin, daily, invest, fixed, exitWeek])

  const isViable = result.monthlyNet > 0 && (result.breakEvenWeek == null || result.breakEvenWeek < result.exitWeek)
  const isDanger = result.isMarginalNeg || (result.breakEvenWeek != null && result.breakEvenWeek >= result.exitWeek)

  function applyPreset(p: typeof PRESETS[0]) {
    setPrice(String(p.price))
    setMargin(String(p.margin))
    setDaily(String(p.daily))
    setInvest(String(p.invest))
    setFixed(String(p.fixed))
  }

  return (
    <div className="fluent-card rounded-2xl p-5 flex flex-col gap-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
          <h3 className="font-semibold text-sm">수익성 시뮬레이터</h3>
          {exitWeek != null && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--color-stop-bg)] text-[var(--color-stop)]">
              EXIT {exitWeek}주 예측
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {keyword} 트렌드 수명 × 내 비용 구조 → 월 수익·손익분기 자동 계산
        </p>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => applyPreset(p)}
            className="text-[11px] px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:border-[#E8510A] hover:text-[#E8510A] transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: '메뉴 판매가',     value: price,  set: setPrice,  unit: '원',   hint: '6,500' },
          { label: '마진율 (재료비 제외)', value: margin, set: setMargin, unit: '%', hint: '68' },
          { label: '하루 판매 목표',  value: daily,  set: setDaily,  unit: '개',   hint: '60' },
          { label: '초기 투자비',     value: invest, set: setInvest, unit: '만원', hint: '3,000' },
          { label: '월 고정비',       value: fixed,  set: setFixed,  unit: '만원', hint: '임대료+인건비+관리비' },
        ].map((f) => (
          <div key={f.label} className={`flex flex-col gap-1 ${f.label === '월 고정비' ? 'col-span-2' : ''}`}>
            <label className="text-[10px] text-muted-foreground">{f.label}</label>
            <div className="relative">
              <Input
                type="number"
                value={f.value}
                onChange={(e) => f.set(e.target.value)}
                placeholder={f.hint}
                className="font-mono text-sm pr-10"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">
                {f.unit}
              </span>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {result.dailyProfit > 0 && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col gap-4"
          >
            {result.isMarginalNeg && (
              <div className="flex items-start gap-2 text-[11px] text-[var(--color-stop)] bg-[var(--color-stop-bg)] rounded-xl px-3 py-2.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" strokeWidth={2.5} />
                <span>
                  월 매출({fmt(result.monthlyRev)})이 월 고정비({fmt(Number(fixed) * 10000)})보다 낮습니다.
                  판매 목표를 높이거나 고정비를 줄여야 합니다.
                </span>
              </div>
            )}
            {isDanger && !result.isMarginalNeg && (
              <div className="flex items-start gap-2 text-[11px] text-[var(--color-stop)] bg-[var(--color-stop-bg)] rounded-xl px-3 py-2.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" strokeWidth={2.5} />
                <span>
                  손익분기({result.breakEvenMonth}개월)가 EXIT({result.exitWeek}주) 이후입니다.
                  초기 투자비를 줄이거나 판매량을 높이세요.
                </span>
              </div>
            )}
            {isViable && (
              <div className="flex items-start gap-2 text-[11px] text-[var(--color-go)] bg-[var(--color-go-bg)] rounded-xl px-3 py-2.5">
                <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" strokeWidth={3} />
                <span>
                  손익분기 {result.breakEvenMonth}개월({result.breakEvenWeek}주) → EXIT {result.exitWeek}주 전 투자 회수 가능합니다.
                </span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  label: '월 순이익',
                  value: result.monthlyNet,
                  display: fmt(result.monthlyNet),
                  color: result.monthlyNet >= 0 ? 'var(--color-go)' : 'var(--color-stop)',
                  big: true,
                },
                {
                  label: 'EXIT까지 순이익',
                  value: result.totalNet,
                  display: fmt(result.totalNet),
                  color: result.totalNet >= 0 ? 'var(--color-go)' : 'var(--color-stop)',
                  big: true,
                },
                {
                  label: '손익분기',
                  value: result.breakEvenMonth ?? 0,
                  display: result.breakEvenMonth ? `${result.breakEvenMonth}개월` : '불가',
                  color: isViable ? 'var(--color-go)' : 'var(--color-stop)',
                  big: false,
                },
              ].map((m) => (
                <div key={m.label} className="bg-secondary rounded-xl p-3 flex flex-col gap-1">
                  <span className="text-[10px] text-muted-foreground">{m.label}</span>
                  <span className="font-mono font-bold text-base leading-tight" style={{ color: m.color }}>
                    {m.display}
                  </span>
                </div>
              ))}
            </div>

            {result.breakEvenWeek != null && result.breakEvenWeek <= result.exitWeek && (
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>시작</span>
                  <span>손익분기 {result.breakEvenMonth}개월</span>
                  <span>EXIT {result.exitWeek}주</span>
                </div>
                <div className="relative h-3 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(result.breakEvenWeek / result.exitWeek) * 100}%` }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute left-0 top-0 h-full rounded-full"
                    style={{ backgroundColor: 'var(--color-wait)' }}
                  />
                  {result.breakEvenWeek < result.exitWeek && (
                    <motion.div
                      initial={{ width: 0, left: `${(result.breakEvenWeek / result.exitWeek) * 100}%` }}
                      animate={{
                        width: `${((result.exitWeek - result.breakEvenWeek) / result.exitWeek) * 100}%`,
                        left:  `${(result.breakEvenWeek / result.exitWeek) * 100}%`,
                      }}
                      transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute top-0 h-full rounded-full"
                      style={{ backgroundColor: 'var(--color-go)' }}
                    />
                  )}
                </div>
                <div className="flex gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: 'var(--color-wait)' }} />
                    투자 회수 구간
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: 'var(--color-go)' }} />
                    순이익 구간
                  </span>
                </div>
              </div>
            )}

            <div className="border border-border rounded-xl divide-y divide-border text-xs">
              {[
                { label: '건당 마진',       value: fmt(result.perItem) },
                { label: '일 수익',         value: fmt(result.dailyProfit) },
                { label: '월 매출',         value: fmt(result.monthlyRev) },
                { label: '월 고정비',       value: `- ${fmt(Number(fixed) * 10000)}` },
                { label: '월 순이익',       value: fmt(result.monthlyNet), bold: true },
                { label: `EXIT까지 누적 (${result.exitWeek}주)`, value: fmt(result.totalNet), bold: true },
              ].map((row) => (
                <div key={row.label} className="flex justify-between px-3 py-2">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className={row.bold ? 'font-semibold' : 'font-mono'}>{row.value}</span>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-muted-foreground/60">
              * 월 30일, 주 4.3주 기준. EXIT 주수는 트렌드 분석 예측값으로 실제와 다를 수 있습니다.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
