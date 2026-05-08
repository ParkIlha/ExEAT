import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'

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

export default function Simulator({ defaultExitWeek }: Props) {
  const [unitCost,   setUnitCost]   = useState('2500')
  const [price,      setPrice]      = useState('6000')
  const [dailySales, setDailySales] = useState('30')
  const [fixedCost,  setFixedCost]  = useState('0')
  const [result,     setResult]     = useState<SimResult | null>(null)
  const [error,      setError]      = useState<string | null>(null)
  const [loading,    setLoading]    = useState(false)

  async function onSimulate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitCost:   Number(unitCost),
          price:      Number(price),
          dailySales: Number(dailySales),
          fixedCost:  Number(fixedCost),
          exitWeek:   defaultExitWeek ?? 0,
        }),
      })
      const json = (await res.json()) as unknown
      if (!res.ok) throw new Error((json as { error?: string }).error ?? `${res.status}`)
      setResult(json as SimResult)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 입력 폼 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: '재료비/건 (원)', value: unitCost, set: setUnitCost },
          { label: '판매가 (원)',    value: price,     set: setPrice    },
          { label: '일 판매량 (개)', value: dailySales,set: setDailySales},
          { label: '초기 고정비 (원)',value: fixedCost, set: setFixedCost },
        ].map(({ label, value, set }) => (
          <div key={label} className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">{label}</label>
            <Input
              type="number"
              value={value}
              onChange={(e) => set(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
        ))}
      </div>

      {defaultExitWeek && (
        <p className="text-xs text-muted-foreground">
          트렌드 분석 EXIT 예상: <span className="font-mono font-medium">{defaultExitWeek}주 후</span> 기준으로 계산됩니다.
        </p>
      )}

      <Button onClick={onSimulate} disabled={loading} className="self-start">
        {loading ? '계산 중…' : '손익 계산하기'}
      </Button>

      {error && <p className="text-xs text-[var(--color-stop)]">{error}</p>}

      {/* 결과 요약 */}
      {result && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: '건당 마진',   value: fmt(result.marginPer) },
              { label: '주간 수익',   value: fmt(result.weeklyProfit) },
              { label: '손익분기',    value: result.breakEvenWeek ? `${result.breakEvenWeek}주` : '즉시' },
              {
                label: 'EXIT 전 누적 수익',
                value: result.profitBeforeExit != null ? fmt(result.profitBeforeExit) : '—',
              },
            ].map(({ label, value }) => (
              <div key={label} className="bg-secondary rounded-xl p-3 flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className="font-mono font-semibold text-sm">{value}</span>
              </div>
            ))}
          </div>

          {/* 누적 수익 그래프 */}
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={result.weeks} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id="simGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--color-go)" stopOpacity={0.15} />
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
        </div>
      )}
    </div>
  )
}
