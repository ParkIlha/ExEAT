import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from 'recharts'

export type TrendPoint = { period: string; ratio: number }

interface Props {
  data: TrendPoint[]
  shoppingData?: TrendPoint[]
  keyword: string
  stage?: 'rising' | 'peak' | 'declining' | 'stable' | null
}

function fmtPeriod(p: string) {
  return p.slice(5).replace('-', '/')
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number; name: string; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-xl px-3 py-2 shadow-sm text-xs min-w-[120px]">
      <p className="font-mono text-muted-foreground mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="font-medium" style={{ color: p.color }}>
          {p.name === 'ratio' ? '검색량' : '쇼핑클릭'}{' '}
          <span className="font-mono">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

function calcAvg(data: TrendPoint[], last = 4) {
  const slice = data.slice(-last)
  if (!slice.length) return null
  return Math.round(slice.reduce((s, d) => s + d.ratio, 0) / slice.length)
}

const STAGE_COLOR: Record<NonNullable<Props['stage']>, string> = {
  rising:   'var(--color-go)',
  peak:     'var(--color-wait)',
  declining:'var(--color-stop)',
  stable:   '#888',
}

export default function TrendChart({ data, shoppingData, keyword, stage }: Props) {
  if (!data.length) return null

  const avg = calcAvg(data)
  const maxRatio = Math.max(...data.map((d) => d.ratio))
  const lineColor = stage ? STAGE_COLOR[stage] : '#888'

  // 검색량 + 쇼핑 클릭 데이터 병합
  const hasShop = shoppingData && shoppingData.length > 0
  const chartData = data.map((d, i) => ({
    ...d,
    period: fmtPeriod(d.period),
    shopping: hasShop ? (shoppingData![i]?.ratio ?? null) : undefined,
  }))

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-1">
        <span className="text-xs font-mono text-muted-foreground">
          {keyword} · 최근 {data.length}주 · 최고 {maxRatio}
        </span>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          {avg !== null && (
            <span>
              4주 평균 <span className="font-mono font-medium text-foreground">{avg}</span>
            </span>
          )}
          {hasShop && (
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 inline-block rounded" style={{ backgroundColor: '#6366f1' }} />
              쇼핑클릭
            </span>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
          <defs>
            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={lineColor} stopOpacity={0.15} />
              <stop offset="95%" stopColor={lineColor} stopOpacity={0}    />
            </linearGradient>
            <linearGradient id="shopGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}   />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border)"
            vertical={false}
          />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fill: 'var(--color-muted-foreground)' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fill: 'var(--color-muted-foreground)' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />

          {avg !== null && (
            <ReferenceLine
              y={avg}
              stroke="var(--color-muted-foreground)"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
          )}

          {/* 쇼핑 클릭 (보조선) */}
          {hasShop && (
            <Area
              type="monotone"
              dataKey="shopping"
              stroke="#6366f1"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              fill="url(#shopGrad)"
              dot={false}
              activeDot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
            />
          )}

          {/* 검색량 (주선) */}
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
