/**
 * 인라인 ROI 계산기
 * 트렌드 EXIT 타이밍 × 내 숫자 = 얼마나 벌 수 있는지
 * Gemini가 줄 수 없는 답: 실시간 데이터 기반 수익 예측
 */
import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { motion, AnimatePresence } from 'framer-motion'
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
  { label: '카페 음료', price: 7000, margin: 65, daily: 40, invest: 1500000 },
  { label: '디저트',   price: 6000, margin: 55, daily: 25, invest: 800000  },
  { label: '식사 메뉴', price: 13000, margin: 45, daily: 30, invest: 3000000 },
]

export default function ROICard({ exitWeek, verdict, keyword }: Props) {
  const [price,   setPrice]  = useState('7000')
  const [margin,  setMargin] = useState('65')   // %
  const [daily,   setDaily]  = useState('40')   // 일 판매량
  const [invest,  setInvest] = useState('1500000') // 초기 투자비

  const result = useMemo(() => {
    const p = Number(price)   || 0
    const m = Number(margin)  || 0
    const d = Number(daily)   || 0
    const iv = Number(invest) || 0
    const ew = exitWeek ?? 12

    const perItem     = p * (m / 100)
    const weeklyProfit = perItem * d * 7
    const totalRevenue = weeklyProfit * ew
    const netProfit   = totalRevenue - iv
    const roi         = iv > 0 ? (netProfit / iv) * 100 : 0
    const breakEven   = weeklyProfit > 0 ? Math.ceil(iv / weeklyProfit) : null

    return { perItem, weeklyProfit, totalRevenue, netProfit, roi, breakEven, exitWeek: ew }
  }, [price, margin, daily, invest, exitWeek])

  const isViable = result.roi > 0 && (result.breakEven == null || result.breakEven < result.exitWeek)
  const isDanger = result.breakEven != null && result.breakEven >= result.exitWeek

  function applyPreset(p: typeof PRESETS[0]) {
    setPrice(String(p.price))
    setMargin(String(p.margin))
    setDaily(String(p.daily))
    setInvest(String(p.invest))
  }

  return (
    <div className="fluent-card rounded-2xl p-5 flex flex-col gap-5">
      {/* 헤더 */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-sm">EXIT까지 얼마나 벌 수 있을까?</h3>
          {exitWeek != null && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--color-stop-bg)] text-[var(--color-stop)]">
              트렌드 EXIT {exitWeek}주 후 예측
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {keyword} 트렌드 수명 × 내 비용 구조 → 예상 수익 자동 계산
        </p>
      </div>

      {/* 업종 프리셋 */}
      <div className="flex gap-1.5 flex-wrap">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => applyPreset(p)}
            className="text-[11px] px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* 입력 2×2 */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: '메뉴 판매가', value: price,  set: setPrice,  unit: '원',  hint: '7,000' },
          { label: '마진율',      value: margin, set: setMargin, unit: '%',   hint: '65' },
          { label: '하루 판매 목표', value: daily, set: setDaily,  unit: '개', hint: '40' },
          { label: '초기 투자비', value: invest, set: setInvest, unit: '원',  hint: '1,500,000' },
        ].map((f) => (
          <div key={f.label} className="flex flex-col gap-1">
            <label className="text-[10px] text-muted-foreground">{f.label}</label>
            <div className="relative">
              <Input
                type="number"
                value={f.value}
                onChange={(e) => f.set(e.target.value)}
                placeholder={f.hint}
                className="font-mono text-sm pr-7"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">
                {f.unit}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── 결과 ── */}
      <AnimatePresence mode="wait">
        {result.weeklyProfit > 0 && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col gap-4"
          >
            {/* 경고 배너 */}
            {isDanger && (
              <div className="flex items-start gap-2 text-[11px] text-[var(--color-stop)] bg-[var(--color-stop-bg)] rounded-xl px-3 py-2.5">
                <span className="shrink-0 mt-0.5">⚠</span>
                <span>
                  손익분기({result.breakEven}주)가 EXIT({result.exitWeek}주)보다 늦습니다.
                  초기 투자비를 줄이거나 판매량을 높여야 합니다.
                </span>
              </div>
            )}
            {isViable && (
              <div className="flex items-start gap-2 text-[11px] text-[var(--color-go)] bg-[var(--color-go-bg)] rounded-xl px-3 py-2.5">
                <span className="shrink-0 mt-0.5">✓</span>
                <span>
                  EXIT 전 투자 회수 가능. 손익분기 {result.breakEven}주 → EXIT {result.exitWeek}주 남아 수익 구간 있음.
                </span>
              </div>
            )}

            {/* 핵심 수치 3개 */}
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  label: 'EXIT까지 순이익',
                  value: result.netProfit,
                  isMoney: true,
                  color: result.netProfit >= 0 ? 'var(--color-go)' : 'var(--color-stop)',
                  big: true,
                },
                {
                  label: '초기 투자 ROI',
                  value: result.roi,
                  isMoney: false,
                  suffix: '%',
                  color: result.roi >= 100 ? 'var(--color-go)' : result.roi >= 0 ? 'var(--color-wait)' : 'var(--color-stop)',
                  big: true,
                },
                {
                  label: '주간 수익',
                  value: result.weeklyProfit,
                  isMoney: true,
                  color: 'var(--color-foreground)',
                  big: false,
                },
              ].map((m) => (
                <div key={m.label} className="bg-secondary rounded-xl p-3 flex flex-col gap-1">
                  <span className="text-[10px] text-muted-foreground">{m.label}</span>
                  <span
                    className="font-mono font-bold text-base leading-tight"
                    style={{ color: m.color }}
                  >
                    {m.isMoney
                      ? fmt(m.value)
                      : `${m.value >= 0 ? '+' : ''}${Math.round(m.value)}${m.suffix ?? ''}`}
                  </span>
                </div>
              ))}
            </div>

            {/* 타임라인 바 */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>도입</span>
                {result.breakEven && <span>손익분기 {result.breakEven}주</span>}
                <span>EXIT {result.exitWeek}주</span>
              </div>
              <div className="relative h-3 bg-secondary rounded-full overflow-hidden">
                {/* 손익분기까지: 적자 구간 */}
                {result.breakEven && result.breakEven <= result.exitWeek && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(result.breakEven / result.exitWeek) * 100}%` }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute left-0 top-0 h-full rounded-full"
                    style={{ backgroundColor: 'var(--color-wait)' }}
                  />
                )}
                {/* 손익분기 이후: 수익 구간 */}
                {result.breakEven && result.breakEven < result.exitWeek && (
                  <motion.div
                    initial={{ width: 0, left: `${(result.breakEven / result.exitWeek) * 100}%` }}
                    animate={{
                      width: `${((result.exitWeek - result.breakEven) / result.exitWeek) * 100}%`,
                      left: `${(result.breakEven / result.exitWeek) * 100}%`,
                    }}
                    transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute top-0 h-full rounded-full"
                    style={{ backgroundColor: 'var(--color-go)' }}
                  />
                )}
                {/* 전체 손실 */}
                {isDanger && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 0.8 }}
                    className="absolute left-0 top-0 h-full rounded-full"
                    style={{ backgroundColor: 'var(--color-stop)', opacity: 0.6 }}
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

            {/* 세부 내역 */}
            <div className="border border-border rounded-xl divide-y divide-border text-xs">
              {[
                { label: '건당 마진',        value: fmt(result.perItem) },
                { label: '주간 수익',        value: fmt(result.weeklyProfit) },
                { label: `총 수익 (${result.exitWeek}주)`, value: fmt(result.totalRevenue) },
                { label: '초기 투자비',      value: fmt(Number(invest)) },
                { label: '최종 순이익',      value: fmt(result.netProfit), bold: true },
              ].map((row) => (
                <div key={row.label} className="flex justify-between px-3 py-2">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className={row.bold ? 'font-semibold' : 'font-mono'}>{row.value}</span>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-muted-foreground/60">
              * EXIT 주수는 트렌드 분석 예측값. 실제 시장 상황에 따라 달라질 수 있습니다.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
