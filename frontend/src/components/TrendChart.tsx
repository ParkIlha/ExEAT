import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'

export type TrendPoint = { period: string; ratio: number }

interface Props {
  data: TrendPoint[]
  keyword: string
  /** STEP 6에서 채워질 — 현재 수명주기 단계 */
  stage?: 'rising' | 'peak' | 'declining' | 'stable' | null
}

// period "2024-11-04" → "11/04"
function fmtPeriod(p: string) {
  return p.slice(5).replace('-', '/')
}

// 커스텀 툴팁
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-xl px-3 py-2 shadow-sm text-xs">
      <p className="font-mono text-[var(--color-muted)]">{label}</p>
      <p className="font-semibold text-[var(--color-ink)] mt-0.5">
        검색량 <span className="font-mono">{payload[0].value}</span>
      </p>
    </div>
  )
}

// 최근 N주 평균 기준선 계산
function calcAvg(data: TrendPoint[], last = 4) {
  const slice = data.slice(-last)
  if (!slice.length) return null
  return Math.round(slice.reduce((s, d) => s + d.ratio, 0) / slice.length)
}

export default function TrendChart({ data, keyword, stage }: Props) {
  if (!data.length) return null

  const avg = calcAvg(data)
  const maxRatio = Math.max(...data.map((d) => d.ratio))
  const chartData = data.map((d) => ({ ...d, period: fmtPeriod(d.period) }))

  // 단계별 라인 색상 (STEP 6 연동 전까지는 ink 색)
  const stageColor: Record<NonNullable<Props['stage']>, string> = {
    rising:   'var(--color-go)',
    peak:     'var(--color-wait)',
    declining:'var(--color-stop)',
    stable:   'var(--color-ink)',
  }
  const lineColor = stage ? stageColor[stage] : 'var(--color-ink)'

  return (
    <div className="w-full">
      {/* 범례 */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono text-[var(--color-muted)]">
          {keyword} · 최근 {data.length}주 · 최고 {maxRatio}
        </span>
        {avg !== null && (
          <span className="text-xs text-[var(--color-muted)]">
            최근 4주 평균{' '}
            <span className="font-mono font-medium text-[var(--color-ink)]">{avg}</span>
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
          <defs>
            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={lineColor} stopOpacity={0.15} />
              <stop offset="95%" stopColor={lineColor} stopOpacity={0}    />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border)"
            vertical={false}
          />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fill: 'var(--color-muted)' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fill: 'var(--color-muted)' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* 4주 평균 기준선 */}
          {avg !== null && (
            <ReferenceLine
              y={avg}
              stroke="var(--color-muted)"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
          )}

          <Area
            type="monotone"
            dataKey="ratio"
            stroke={lineColor}
            strokeWidth={2}
            fill="url(#trendGrad)"
            dot={false}
            activeDot={{ r: 4, fill: lineColor, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
