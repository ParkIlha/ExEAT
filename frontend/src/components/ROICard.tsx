import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { motion } from 'framer-motion'
import { AlertTriangle, Check } from 'lucide-react'

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
  { label: '카페·음료',      price: 6500,  cost: 2100, daily: 60,  fixed: 250 },
  { label: '디저트·베이커리', price: 5500,  cost: 2300, daily: 35,  fixed: 180 },
  { label: '분식·패스트푸드', price: 9000,  cost: 4300, daily: 50,  fixed: 220 },
  { label: '식사 메뉴',      price: 13000, cost: 7200, daily: 40,  fixed: 350 },
]

const VERDICT_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  GO:   { bg: 'bg-[var(--color-go-bg)]',   text: 'text-[var(--color-go)]',   label: 'GO' },
  WAIT: { bg: 'bg-[var(--color-wait-bg)]', text: 'text-[var(--color-wait)]', label: 'WAIT' },
  STOP: { bg: 'bg-[var(--color-stop-bg)]', text: 'text-[var(--color-stop)]', label: 'STOP' },
}

export default function ROICard({ exitWeek, verdict, keyword }: Props) {
  const [price,    setPrice]    = useState('6500')
  const [cost,     setCost]     = useState('2100')
  const [daily,    setDaily]    = useState('60')
  const [fixed,    setFixed]    = useState('250')
  const [overhead, setOverhead] = useState('12')

  const r = useMemo(() => {
    const p   = Number(price)    || 0
    const c   = Number(cost)     || 0
    const d   = Number(daily)    || 0
    const fc  = (Number(fixed)   || 0) * 10000
    const ovr = (Number(overhead)|| 0) / 100
    const ew  = exitWeek ?? 12

    const perItem       = p - c
    const monthlyRev    = p * d * 30
    const monthlyCost   = c * d * 30
    const contribution  = monthlyRev - monthlyCost
    const monthlyOverhead = monthlyRev * ovr
    const monthlyNet    = contribution - fc - monthlyOverhead
    const taxRate       = monthlyNet > 0 ? 0.15 : 0
    const monthlyNetAfterTax = monthlyNet * (1 - taxRate)
    const totalNet      = monthlyNetAfterTax * (ew / 4.3)
    const breakEvenDaily = (fc + monthlyRev * ovr / 30) > 0 && perItem > 0
      ? Math.ceil((fc + monthlyRev * ovr) / (perItem * 30))
      : null

    return { perItem, monthlyRev, monthlyCost, contribution, monthlyOverhead, monthlyNet, monthlyNetAfterTax, totalNet, breakEvenDaily, exitWeek: ew, fc, taxRate }
  }, [price, cost, daily, fixed, overhead, exitWeek])

  const isViable = r.monthlyNetAfterTax > 0 && (r.breakEvenDaily == null || r.breakEvenDaily < Number(daily))
  const isDanger = r.monthlyNetAfterTax <= 0

  const vs = VERDICT_STYLE[verdict] ?? VERDICT_STYLE.WAIT

  function applyPreset(p: typeof PRESETS[0]) {
    setPrice(String(p.price)); setCost(String(p.cost))
    setDaily(String(p.daily)); setFixed(String(p.fixed))
    setOverhead('12')
  }

  return (
    <div className="fluent-card rounded-2xl overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-border">
        <p className="text-xs font-semibold text-[#E8510A] tracking-widest uppercase mb-1">P&L Simulation</p>
        <h3 className="text-xl font-bold tracking-tight">수익성 시뮬레이터</h3>
        <div className="flex gap-1.5 flex-wrap mt-2.5">
          {PRESETS.map((p) => (
            <button key={p.label} type="button" onClick={() => applyPreset(p)}
              className="text-[13px] px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:border-[#E8510A] hover:text-[#E8510A] transition-colors">
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">

        {/* ── 왼쪽: 입력 ── */}
        <div className="p-5 flex flex-col gap-4">
          <p className="text-xs font-semibold text-[#E8510A] flex items-center gap-1.5">
            <span>$</span> 입력값 <span className="text-muted-foreground font-normal">(예: {keyword})</span>
          </p>
          {[
            { label: '재료비 (1개당)', value: cost,     set: setCost,     unit: '원',   hint: '2,100' },
            { label: '판매가',         value: price,    set: setPrice,    unit: '원',   hint: '6,500' },
            { label: '예상 일 판매량', value: daily,    set: setDaily,    unit: '개',   hint: '60' },
            { label: '월 고정비',      value: fixed,    set: setFixed,    unit: '만원', hint: '임대료+인건비' },
            { label: '기타 운영비율',  value: overhead, set: setOverhead, unit: '%',    hint: '카드수수료·소모품' },
          ].map((f) => (
            <div key={f.label} className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground shrink-0">{f.label}</span>
              <div className="relative w-32">
                <Input type="number" value={f.value} onChange={(e) => f.set(e.target.value)}
                  placeholder={f.hint} className="font-mono text-sm text-right pr-8 h-8" />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">{f.unit}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── 가운데: 계산 결과 ── */}
        <div className="p-5 bg-[#E8510A] text-white flex flex-col gap-3">
          <p className="text-xs font-semibold opacity-80 flex items-center gap-1">
            <span>↗</span> 월 예상 손익 계산 결과
          </p>
          {[
            {
              label: '월 매출',
              sub: `${Number(price).toLocaleString()}원 × ${daily}개 × 30일`,
              value: fmt(r.monthlyRev),
              big: false,
            },
            {
              label: '월 재료비',
              sub: `${Number(cost).toLocaleString()}원 × ${daily}개 × 30일`,
              value: `−${fmt(r.monthlyCost)}`,
              big: false,
            },
            {
              label: `기타 운영비 (${overhead}%)`,
              sub: '카드수수료·포장재·소모품 등',
              value: `−${fmt(r.monthlyOverhead)}`,
              big: false,
            },
            {
              label: '월 고정비',
              sub: '임대료·인건비·공과금',
              value: `−${fmt(r.fc)}`,
              big: false,
            },
            {
              label: '세전 순이익',
              sub: '매출 − 전체 비용',
              value: fmt(r.monthlyNet),
              big: false,
            },
            {
              label: '세후 순이익',
              sub: r.monthlyNet > 0 ? `세율 약 ${Math.round(r.taxRate * 100)}% 적용` : '세금 없음',
              value: fmt(r.monthlyNetAfterTax),
              big: true,
            },
          ].map((row) => (
            <div key={row.label} className={`flex items-end justify-between border-b border-white/20 pb-2 ${row.big ? 'pt-1' : ''}`}>
              <div>
                <p className={`${row.big ? 'text-sm font-semibold' : 'text-xs opacity-80'}`}>{row.label}</p>
                <p className="text-xs opacity-60">{row.sub}</p>
              </div>
              <span className={`font-mono font-bold ${row.big ? 'text-2xl' : 'text-base'}`}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* ── 오른쪽: 판정 + 손익분기 ── */}
        <div className="p-5 flex flex-col gap-4">
          <div className={`rounded-2xl p-4 flex flex-col items-center gap-2 ${vs.bg}`}>
            {isViable
              ? <Check className={`w-8 h-8 ${vs.text}`} strokeWidth={2.5} />
              : <AlertTriangle className={`w-8 h-8 ${vs.text}`} strokeWidth={2.5} />
            }
            <span className={`text-2xl font-black tracking-tight ${vs.text}`}>{vs.label}</span>
            <span className="text-xs text-muted-foreground text-center">
              {isDanger ? '월 고정비 미달, 구조 재검토 필요' : isViable ? '현재 진입 추천' : '수익 구조 재검토'}
            </span>
          </div>

          <div className="bg-secondary rounded-2xl p-4 flex flex-col items-center gap-1">
            <span className="text-[13px] text-muted-foreground">손익분기 일판매량</span>
            <motion.span
              key={r.breakEvenDaily}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-3xl font-black font-mono"
            >
              {r.breakEvenDaily ?? '—'}
            </motion.span>
            {r.breakEvenDaily != null && (
              <span className="text-xs text-muted-foreground">
                개 / 현재 {daily}개 &gt; {Number(daily) >= r.breakEvenDaily ? '✓ 안전' : '⚠ 부족'}
              </span>
            )}
          </div>

          {exitWeek != null && (
            <div className="text-[13px] text-muted-foreground text-center border border-border rounded-xl px-3 py-2">
              EXIT {exitWeek}주 기준 세후 누적 순이익<br />
              <span className={`font-mono font-bold text-sm ${r.totalNet >= 0 ? 'text-[var(--color-go)]' : 'text-[var(--color-stop)]'}`}>
                {fmt(r.totalNet)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
