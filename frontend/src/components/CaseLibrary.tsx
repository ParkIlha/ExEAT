import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'

type Case = {
  id: string
  name: string
  pattern: string
  peakYear: number
  status: string
  duration: string
  summary: string
  lesson: string
  tags: string[]
}

const PATTERN_LABEL: Record<string, string> = {
  sudden_rise_fall: '급등 후 급락',
  gradual_decline:  '완만한 하락',
  steady:           '장기 안정',
  seasonal:         '계절 반복',
}

const STATUS_STYLE: Record<string, string> = {
  extinct:  'bg-[var(--color-stop-bg)]  text-[var(--color-stop)]  border-[var(--color-stop)]',
  declining:'bg-[var(--color-wait-bg)]  text-[var(--color-wait)]  border-[var(--color-wait)]',
  niche:    'bg-secondary text-muted-foreground border-border',
  steady:   'bg-[var(--color-go-bg)]   text-[var(--color-go)]    border-[var(--color-go)]',
}

const STATUS_LABEL: Record<string, string> = {
  extinct:  '소멸',
  declining:'하락 중',
  niche:    '틈새 잔존',
  steady:   '안정',
}

interface Props {
  pattern?: string | null
}

export default function CaseLibrary({ pattern }: Props) {
  const [cases, setCases] = useState<Case[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    const url = pattern
      ? `/api/cases?pattern=${encodeURIComponent(pattern)}`
      : '/api/cases'

    fetch(url)
      .then((r) => r.json())
      .then((d: Case[]) => setCases(d))
      .catch(() => setCases([]))
  }, [pattern])

  if (!cases.length) return null

  return (
    <div className="flex flex-col gap-3">
      {pattern && (
        <p className="text-xs text-muted-foreground">
          패턴 유사 사례 — <span className="font-medium">{PATTERN_LABEL[pattern] ?? pattern}</span>
        </p>
      )}
      {cases.map((c) => (
        <button
          key={c.id}
          type="button"
          className="w-full text-left border border-border rounded-xl p-4 hover:bg-secondary transition-colors"
          onClick={() => setExpanded(expanded === c.id ? null : c.id)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{c.name}</span>
              <span className="text-xs text-muted-foreground font-mono">{c.peakYear}</span>
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${STATUS_STYLE[c.status] ?? ''}`}>
                {STATUS_LABEL[c.status] ?? c.status}
              </Badge>
            </div>
            <span className="text-muted-foreground text-sm shrink-0">{expanded === c.id ? '▲' : '▼'}</span>
          </div>

          <p className="text-xs text-muted-foreground mt-1">{c.duration}</p>

          {expanded === c.id && (
            <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
              <p className="text-sm leading-relaxed">{c.summary}</p>
              <div className="bg-secondary rounded-lg p-3">
                <p className="text-xs font-medium mb-0.5">교훈</p>
                <p className="text-xs text-muted-foreground">{c.lesson}</p>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {c.tags.map((t) => (
                  <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </button>
      ))}
    </div>
  )
}
