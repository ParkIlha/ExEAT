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
  ReferenceArea,
  ResponsiveContainer,
} from 'recharts'

export type TrendPoint = { period: string; ratio: number }
export type ForecastPoint = { week: number; ratio: number }

interface Props {
  data: TrendPoint[]
  shoppingData?: TrendPoint[]
  googleData?: TrendPoint[]
  forecast?: ForecastPoint[]
  inflectionWeek?: number | null
  keyword: string
  stage?: 'rising' | 'peak' | 'declining' | 'stable' | null
  peakRatio?: number
  riskScore?: number
}

function fmtPeriod(p: string) {
  return p.slice(5).replace('-', '/')
}

const STAGE_COLOR: Record<NonNullable<Props['stage']>, string> = {
  rising:    'var(--color-go)',
  peak:      'var(--color-wait)',
  declining: 'var(--color-stop)',
  stable:    '#888',
}

// ReferenceArea fill은 CSS 변수를 쓸 수 없어 rgba 직접 사용
const STAGE_FILL_RGBA: Record<NonNullable<Props['stage']>, string> = {
  rising:    'rgba(34, 197, 94, 0.07)',
  peak:      'rgba(234, 179, 8, 0.07)',
  declining: 'rgba(239, 68, 68, 0.07)',
  stable:    'rgba(107, 114, 128, 0.05)',
}

const STAGE_KO: Record<NonNullable<Props['stage']>, string> = {
  rising: '상승기', peak: '정점', declining: '하락기', stable: '안정기',
}

function CustomTooltip({
  active, payload, label,
}: {
  active?: boolean
  payload?: { value: number; name: string; color: string; dataKey: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const labelMap: Record<string, string> = {
    ratio: '네이버 검색',
    shopping: '쇼핑 클릭',
    google: '구글 트렌드',
    forecast: '예측',
    composite: '시그널 강도',
  }
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-xl px-3 py-2 shadow-sm text-xs min-w-[130px]">
      <p className="font-mono text-muted-foreground mb-1.5">{label}</p>
      {payload
        .filter((p) => p.value != null && p.dataKey !== 'composite')
        .map((p) => (
          <p key={p.dataKey} className="font-medium flex justify-between gap-4" style={{ color: p.color }}>
            <span>{labelMap[p.dataKey] ?? p.dataKey}</span>
            <span className="font-mono">{Number(p.value).toFixed(0)}</span>
          </p>
        ))}
    </div>
  )
}

export default function TrendChart({
  data, shoppingData, googleData, forecast, inflectionWeek,
  keyword, stage, peakRatio, riskScore,
}: Props) {
  if (!data.length) return null

  const maxRatio = peakRatio ?? Math.max(...data.map((d) => d.ratio))
  const exitThreshold = Math.round(maxRatio * 0.5)
  const lineColor = stage ? STAGE_COLOR[stage] : '#888'
  const stageKo = stage ? STAGE_KO[stage] : null

  const hasShop     = shoppingData && shoppingData.length > 0
  const hasGoogle   = googleData && googleData.length > 0
  const hasForecast = forecast && forecast.length > 0

  const googleMap = hasGoogle
    ? Object.fromEntries(googleData!.map((g) => [fmtPeriod(g.period), g.ratio]))
    : {}

  const lastReal = data[data.length - 1]

  // ── 데이터 병합 + 시그널 강도 합성 ────────────────────────────────────────
  const merged: Array<{
    period: string
    ratio: number | null
    shopping: number | null
    google: number | null
    forecast: number | null
    composite: number | null
  }> = data.map((d, i) => {
    const periodKey = fmtPeriod(d.period)
    const shopVal = hasShop ? (shoppingData![i]?.ratio ?? null) : null
    // 시그널 강도: (검색 + 쇼핑) / 2, 쇼핑 없으면 검색만
    const composite = shopVal != null
      ? Math.round((d.ratio + shopVal) / 2)
      : null
    return {
      period: periodKey,
      ratio: d.ratio,
      shopping: shopVal,
      google: hasGoogle ? (googleMap[periodKey] ?? null) : null,
      forecast: i === data.length - 1 ? d.ratio : null,
      composite,
    }
  })

  if (hasForecast) {
    forecast!.forEach((f) => {
      merged.push({
        period: `+${f.week}주`,
        ratio: null,
        shopping: null,
        google: null,
        forecast: f.ratio,
        composite: null,
      })
    })
  }

  // ── 변곡점 ────────────────────────────────────────────────────────────────
  const inflectionPeriod =
    inflectionWeek != null && inflectionWeek >= 0 && inflectionWeek < data.length
      ? fmtPeriod(data[inflectionWeek].period)
      : null
  const inflectionRatio =
    inflectionWeek != null && inflectionWeek >= 0 && inflectionWeek < data.length
      ? data[inflectionWeek].ratio
      : null

  const inflPeriodStr = inflectionPeriod
  const endRealPeriod = fmtPeriod(lastReal.period)
  // ReferenceArea fill은 CSS 변수 불가 → rgba 직접 사용
  const currFill = stage ? STAGE_FILL_RGBA[stage] : 'rgba(107,114,128,0.05)'
  const prevFill: string | null = inflPeriodStr
    ? (stage === 'declining' || stage === 'stable' || stage === 'peak'
        ? STAGE_FILL_RGBA['rising']
        : null)
    : null

  return (
    <div className="w-full">
      {/* 제목 + 메타 */}
      <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
        <div>
          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            수명주기 분석
            {stageKo && (
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                style={{ color: lineColor, backgroundColor: currFill }}
              >
                {stageKo}
              </span>
            )}
            {riskScore != null && (
              <span className="text-[10px] text-muted-foreground font-normal">
                위험도 {riskScore}/100
              </span>
            )}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {keyword} · {data.length}주 실측 + 4주 예측 | 네이버 DataLab
            {hasShop ? ' · 쇼핑클릭' : ''}
            {hasGoogle ? ' · 구글트렌드' : ''}
          </p>
        </div>
        {/* 범례 */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 inline-block rounded" style={{ backgroundColor: lineColor }} />
            네이버 검색
          </span>
          {hasShop && (
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 inline-block rounded" style={{ backgroundColor: '#6366f1' }} />
              쇼핑클릭
            </span>
          )}
          {hasGoogle && (
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 inline-block rounded" style={{ backgroundColor: '#f59e0b' }} />
              구글트렌드
            </span>
          )}
          {hasForecast && (
            <span className="flex items-center gap-1">
              <span
                className="w-5 border-t-2 border-dashed inline-block"
                style={{ borderColor: lineColor }}
              />
              예측
            </span>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={merged} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
          <defs>
            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={lineColor} stopOpacity={0.20} />
              <stop offset="95%" stopColor={lineColor} stopOpacity={0}    />
            </linearGradient>
            <linearGradient id="shopGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.10} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}    />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 10, fontFamily: 'monospace', fill: 'var(--color-muted-foreground)' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fontFamily: 'monospace', fill: 'var(--color-muted-foreground)' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* ── 수명주기 단계 배경 구간 (rgba 직접 사용) ── */}
          {inflPeriodStr && prevFill && (
            <ReferenceArea
              x1={merged[0].period}
              x2={inflPeriodStr}
              fill={prevFill}
              stroke="none"
            />
          )}
          <ReferenceArea
            x1={inflPeriodStr ?? merged[0]?.period}
            x2={endRealPeriod}
            fill={currFill}
            stroke="none"
          />

          {/* ── EXIT 임계선 (정점 × 50%) ── */}
          <ReferenceLine
            y={exitThreshold}
            stroke="var(--color-stop)"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            label={{
              value: `EXIT 임계선 ${exitThreshold}`,
              fontSize: 9,
              fill: 'var(--color-stop)',
              position: 'insideTopLeft',
            }}
          />

          {/* ── 실측/예측 경계 ── */}
          {hasForecast && (
            <ReferenceLine
              x={fmtPeriod(lastReal.period)}
              stroke="var(--color-border)"
              strokeWidth={1}
              label={{
                value: '현재',
                fontSize: 9,
                fill: 'var(--color-muted-foreground)',
                position: 'insideTopRight',
              }}
            />
          )}

          {/* ── 변곡점 마커 ── */}
          {inflectionPeriod && inflectionRatio != null && (
            <ReferenceDot
              x={inflectionPeriod}
              y={inflectionRatio}
              r={5}
              fill="var(--color-wait)"
              stroke="white"
              strokeWidth={2}
              label={{
                value: '전환',
                fontSize: 8,
                fill: 'var(--color-wait)',
                position: 'top',
              }}
            />
          )}

          {/* ── 구글 트렌드 ── */}
          {hasGoogle && (
            <Line
              type="monotone"
              dataKey="google"
              stroke="#f59e0b"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              dot={false}
              connectNulls
              activeDot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }}
            />
          )}

          {/* ── 쇼핑 클릭 ── */}
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

          {/* ── 검색량 메인 ── */}
          <Area
            type="monotone"
            dataKey="ratio"
            stroke={lineColor}
            strokeWidth={2.5}
            fill="url(#trendGrad)"
            dot={false}
            activeDot={{ r: 4, fill: lineColor, strokeWidth: 0 }}
          />

          {/* ── 예측 ── */}
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

      {/* ── 하단 인사이트 배너 ── */}
      <div className="mt-3 flex items-center gap-3 flex-wrap">
        <div
          className="text-[10px] px-2.5 py-1 rounded-md font-medium"
          style={{ color: lineColor, backgroundColor: currFill }}
        >
          현재 {stage ? STAGE_KO[stage] : '—'}
        </div>
        <p className="text-[11px] text-muted-foreground">
          EXIT 임계선({exitThreshold}) 이하로 떨어지면 수요가 절반 이하로 감소한 것입니다
        </p>
      </div>
    </div>
  )
}
