import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { useAnalysis } from '@/store/analysis'
import CountUp from '@/components/CountUp'

type SimResult = {
  marginPer: number
  weeklyProfit: number
  breakEvenWeek: number | null
  exitWeek: number | null
  profitBeforeExit: number | null
  weeks: { week: number; cumulative: number; profit: number }[]
}

interface Props {
  defaultExitWeek?: number | null
}

function fmt(n: number) {
  if (Math.abs(n) >= 10000) return `${(n / 10000).toFixed(1)}만원`
  return `${n.toLocaleString()}원`
}

const FIELDS: { key: keyof SimInputLike; label: string }[] = [
  { key: 'unitCost',   label: '재료비/건 (원)' },
  { key: 'price',      label: '판매가 (원)' },
  { key: 'dailySales', label: '일 판매량 (개)' },
  { key: 'fixedCost',  label: '초기 고정비 (원)' },
]

type SimInputLike = {
  unitCost: string
  price: string
  dailySales: string
  fixedCost: string
}

export default function Simulator({ defaultExitWeek }: Props) {
  const { simInput, setSimInput } = useAnalysis()
  const [result, setResult]   = useState<SimResult | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSimulate() {
    setLoading(true)
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitCost:   Number(simInput.unitCost),
          price:      Number(simInput.price),
          dailySales: Number(simInput.dailySales),
          fixedCost:  Number(simInput.fixedCost),
          exitWeek:   defaultExitWeek ?? 0,
        }),
      })
      const json = (await res.json()) as unknown
      if (!res.ok) throw new Error((json as { error?: string }).error ?? `${res.status}`)
      setResult(json as SimResult)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 입력 폼 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {FIELDS.map(({ key, label }) => (
          <div key={key} className="flex flex-col gap-1">
            <label className="text-[11px] text-muted-foreground">{label}</label>
            <Input
              type="number"
              value={simInput[key]}
              onChange={(e) => setSimInput({ [key]: e.target.value })}
              className="font-mono text-sm"
            />
          </div>
        ))}
      </div>

      {defaultExitWeek && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-stop)]" />
          트렌드 분석 EXIT 예상: <span className="font-mono font-medium text-foreground">{defaultExitWeek}주 후</span> 기준으로 계산
        </div>
      )}

      <Button onClick={onSimulate} disabled={loading} className="self-start">
        {loading ? '계산 중…' : '손익 계산하기'}
      </Button>

      {/* 결과 */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col gap-5"
          >
            {/* 핵심 지표 4개 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: '건당 마진',          raw: result.marginPer,  unit: '원', big: false },
                { label: '주간 수익',          raw: result.weeklyProfit, unit: '원', big: true },
                {
                  label: '손익분기',
                  rendered: result.breakEvenWeek ? <span><CountUp to={result.breakEvenWeek} duration={800} />주</span> : '즉시',
                },
                {
                  label: 'EXIT 전 누적 수익',
                  rendered: result.profitBeforeExit != null
                    ? <span>{fmt(result.profitBeforeExit)}</span>
                    : '—',
                },
              ].map((m, i) => (
                <motion.div
                  key={m.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="bg-secondary rounded-2xl p-3 flex flex-col gap-1"
                >
                  <span className="text-[11px] text-muted-foreground">{m.label}</span>
                  <span className="font-mono font-semibold text-sm">
                    {m.rendered ?? <>
                      <CountUp to={m.raw ?? 0} duration={1000} />{m.unit}
                    </>}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* 누적 수익 그래프 */}
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={result.weeks} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                <defs>
                  <linearGradient id="simGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--color-go)" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="var(--color-go)" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fill: 'var(--color-muted-foreground)' }}
                  tickLine={false} axisLine={false}
                  tickFormatter={(v) => `${v}주`}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fill: 'var(--color-muted-foreground)' }}
                  tickLine={false} axisLine={false}
                  tickFormatter={(v) => v >= 10000 ? `${(v/10000).toFixed(0)}만` : String(v)}
                />
                <Tooltip
                  formatter={(v: number) => [fmt(v), '누적 수익']}
                  labelFormatter={(l) => `${l}주차`}
                  contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid var(--color-border)' }}
                />
                {result.breakEvenWeek && (
                  <ReferenceLine x={result.breakEvenWeek} stroke="var(--color-go)" strokeDasharray="4 4" label={{ value: '손익분기', fontSize: 10, fill: 'var(--color-go)' }} />
                )}
                {result.exitWeek && (
                  <ReferenceLine x={result.exitWeek} stroke="var(--color-stop)" strokeDasharray="4 4" label={{ value: 'EXIT', fontSize: 10, fill: 'var(--color-stop)' }} />
                )}
                <ReferenceLine y={0} stroke="var(--color-border)" />
                <Area type="monotone" dataKey="cumulative" stroke="var(--color-go)" strokeWidth={2} fill="url(#simGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
