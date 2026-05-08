import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type RegionItem = { code: string; name: string }
type RegionResult = {
  region: string
  total: number
  score: number
  verdict: '적합' | '보통' | '부적합'
  reason: string
  age: Record<string, number>
  floating: string
}

interface Props {
  stage: 'rising' | 'peak' | 'declining' | 'stable' | null
}

const VERDICT_STYLE: Record<string, string> = {
  '적합':   'bg-[var(--color-go-bg)] text-[var(--color-go)] border-[var(--color-go)]',
  '보통':   'bg-[var(--color-wait-bg)] text-[var(--color-wait)] border-[var(--color-wait)]',
  '부적합': 'bg-[var(--color-stop-bg)] text-[var(--color-stop)] border-[var(--color-stop)]',
}

const AGE_LABEL: Record<string, string> = {
  '10s': '10대', '20s': '20대', '30s': '30대',
  '40s': '40대', '50s': '50대', '60s+': '60대+',
}

const FLOAT_LABEL: Record<string, string> = {
  high: '많음', medium: '보통', low: '적음',
}

export default function RegionPanel({ stage }: Props) {
  const [regions, setRegions]   = useState<RegionItem[]>([])
  const [selected, setSelected] = useState<string>('')
  const [result, setResult]     = useState<RegionResult | null>(null)
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    fetch('/api/region/list')
      .then((r) => r.json())
      .then((d: RegionItem[]) => {
        setRegions(d)
        if (d.length) setSelected(d[0].code)
      })
      .catch(() => {})
  }, [])

  async function onAnalyze() {
    if (!selected || !stage) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/region/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regionCode: selected, stage }),
      })
      const json = await res.json() as RegionResult
      setResult(json)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  if (!stage) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        키워드를 먼저 분석하면 지역 적합도를 확인할 수 있습니다.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 지역 선택 */}
      <div className="flex gap-2 flex-wrap sm:flex-nowrap">
        <select
          className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          value={selected}
          onChange={(e) => { setSelected(e.target.value); setResult(null); }}
        >
          {regions.map((r) => (
            <option key={r.code} value={r.code}>{r.name}</option>
          ))}
        </select>
        <Button onClick={onAnalyze} disabled={loading || !selected} className="shrink-0">
          {loading ? '분석 중…' : '적합도 보기'}
        </Button>
      </div>

      {/* 결과 */}
      {result && (
        <div className="flex flex-col gap-3">
          {/* 헤더 */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{result.region}</span>
            <Badge variant="outline" className={`text-xs ${VERDICT_STYLE[result.verdict] ?? ''}`}>
              {result.verdict}
            </Badge>
            <span className="text-xs text-muted-foreground font-mono ml-auto">
              적합도 {result.score}/100
            </span>
          </div>

          {/* 점수 바 */}
          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${result.score}%`,
                backgroundColor:
                  result.verdict === '적합' ? 'var(--color-go)' :
                  result.verdict === '보통'  ? 'var(--color-wait)' :
                  'var(--color-stop)',
              }}
            />
          </div>

          {/* 이유 */}
          <p className="text-xs text-muted-foreground">{result.reason}</p>

          {/* 인구 통계 바 */}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-muted-foreground">연령 분포</p>
            {Object.entries(result.age).map(([key, pct]) => (
              <div key={key} className="flex items-center gap-2 text-xs">
                <span className="w-10 text-right text-muted-foreground font-mono shrink-0">{AGE_LABEL[key] ?? key}</span>
                <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-foreground/30"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-7 text-right font-mono text-muted-foreground">{pct}%</span>
              </div>
            ))}
          </div>

          {/* 기타 정보 */}
          <div className="flex gap-3 text-[11px] text-muted-foreground">
            <span>총인구 <span className="font-mono font-medium text-foreground">{(result.total / 10000).toFixed(0)}만</span></span>
            <span>유동인구 <span className="font-mono font-medium text-foreground">{FLOAT_LABEL[result.floating] ?? '보통'}</span></span>
          </div>
        </div>
      )}
    </div>
  )
}
