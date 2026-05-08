import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
  ResponsiveContainer,
} from 'recharts'

export type TrendPoint = { period: string; ratio: number }
export type ForecastPoint = { week: number; ratio: number }

interface Props {
  data: TrendPoint[]
  shoppingData?: TrendPoint[]
  forecast?: ForecastPoint[]
  inflectionWeek?: number | null
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
  payload?: { value: number; name: string; color: string; dataKey: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const labelMap: Record<string, string> = {
    ratio: '검색량',
    shopping: '쇼핑클릭',
    forecast: '예측',
  }
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-xl px-3 py-2 shadow-sm text-xs min-w-[120px]">
      <p className="font-mono text-muted-foreground mb-1">{label}</p>
      {payload
        .filter((p) => p.value != null)
        .map((p) => (
          <p key={p.dataKey} className="font-medium" style={{ color: p.color }}>
            {labelMap[p.dataKey] ?? p.dataKey}{' '}
            <span className="font-mono">{Number(p.value).toFixed(0)}</span>
          </p>
        ))}
    </div>
  )
}

const STAGE_COLOR: Record<NonNullable<Props['stage']>, string> = {
  rising:    'var(--color-go)',
  peak:      'var(--color-wait)',
  declining: 'var(--color-stop)',
  stable:    '#888',
}

export default function TrendChart({
  data, shoppingData, forecast, inflectionWeek, keyword, stage,
}: Props) {
  if (!data.length) return null

  const maxRatio = Math.max(...data.map((d) => d.ratio))
  const lineColor = stage ? STAGE_COLOR[stage] : '#888'

  const hasShop     = shoppingData && shoppingData.length > 0
  const hasForecast = forecast && forecast.length > 0

  // 실측 + 예측 데이터 병합 (예측은 마지막 실측 점부터 이어지게)
  const lastReal = data[data.length - 1]
  const merged: Array<{
    period: string
    ratio: number | null
    shopping: number | null
    forecast: number | null
  }> = data.map((d, i) => ({
    period: fmtPeriod(d.period),
    ratio: d.ratio,
    shopping: hasShop ? (shoppingData![i]?.ratio ?? null) : null,
    forecast: i === data.length - 1 ? d.ratio : null,
  }))

  if (hasForecast) {
    forecast!.forEach((f) => {
      merged.push({
        period: `+${f.week}주`,
        ratio: null,
        shopping: null,
        forecast: f.ratio,
      })
    })
  }

  // 변곡점: data 안에서 inflectionWeek 인덱스의 period
  const inflectionPeriod =
    inflectionWeek != null && inflectionWeek >= 0 && inflectionWeek < data.length
      ? fmtPeriod(data[inflectionWeek].period)
      : null
  const inflectionRatio =
    inflectionWeek != null && inflectionWeek >= 0 && inflectionWeek < data.length
      ? data[inflectionWeek].ratio
      : null

  return (
    <div className="w-full">
      {/* 범례 */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <span className="text-xs font-mono text-muted-foreground">
          {keyword} · 최근 {data.length}주 · 최고 {maxRatio}
        </span>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 inline-block rounded" style={{ backgroundColor: lineColor }} />
            검색량
          </span>
          {hasShop && (
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 inline-block rounded" style={{ backgroundColor: '#6366f1' }} />
              쇼핑클릭
            </span>
          )}
          {hasForecast && (
            <span className="flex items-center gap-1">
              <span className="w-3 border-t border-dashed inline-block" style={{ borderColor: lineColor, borderTopWidth: '2px' }} />
              4주 예측
            </span>
          )}
          {inflectionPeriod && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full inline-block bg-[var(--color-wait)]" />
              변곡점
            </span>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={merged} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
          <defs>
            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={lineColor} stopOpacity={0.18} />
              <stop offset="95%" stopColor={lineColor} stopOpacity={0}    />
            </linearGradient>
            <linearGradient id="shopGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}   />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
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

          {/* 실측/예측 경계 */}
          {hasForecast && (
            <ReferenceLine
              x={fmtPeriod(lastReal.period)}
              stroke="var(--color-border)"
              strokeWidth={1}
              label={{ value: '현재', fontSize: 9, fill: 'var(--color-muted-foreground)', position: 'insideTopRight' }}
            />
          )}

          {/* 변곡점 마커 */}
          {inflectionPeriod && inflectionRatio != null && (
            <ReferenceDot
              x={inflectionPeriod}
              y={inflectionRatio}
              r={5}
              fill="var(--color-wait)"
              stroke="white"
              strokeWidth={2}
            />
          )}

          {/* 쇼핑 클릭 (보조) */}
          {hasShop && (
            <Area
              type="monotone"
              dataKey="shopping"
              stroke="#6366f1"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              fill="url(#shopGrad)"
              dot={false}
              connectNulls
              activeDot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
            />
          )}

          {/* 검색량 (실측 메인) */}
          <Area
            type="monotone"
            dataKey="ratio"
            stroke={lineColor}
            strokeWidth={2.5}
            fill="url(#trendGrad)"
            dot={false}
            activeDot={{ r: 4, fill: lineColor, strokeWidth: 0 }}
          />

          {/* 예측 라인 (대시) */}
          {hasForecast && (
            <Line
              type="monotone"
              dataKey="forecast"
              stroke={lineColor}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={{ r: 3, fill: 'white', stroke: lineColor, strokeWidth: 1.5 }}
              connectNulls
              isAnimationActive={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
