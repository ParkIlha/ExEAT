import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import type { TrendingItem, ItemType } from '@/store/analysis'

const ITEM_TYPE_LABEL: Record<ItemType, { label: string; color: string }> = {
  trending: { label: '🔥 폭발 상승', color: 'var(--color-stop)' },
  growing:  { label: '↗ 성장',     color: 'var(--color-go)' },
  classic:  { label: '★ 클래식',   color: 'var(--color-go)' },
  seasonal: { label: '◇ 계절성',   color: 'var(--color-wait)' },
  fading:   { label: '↘ 한물감',   color: 'var(--color-stop)' },
  niche:    { label: '◦ 틈새',     color: '#888' },
  stable:   { label: '— 안정',     color: '#888' },
}

export default function TrendingSection() {
  const navigate = useNavigate()
  const [items, setItems]     = useState<TrendingItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)

  useEffect(() => {
    fetch('/api/trending?top=5')
      .then((r) => r.json())
      .then((d: TrendingItem[]) => setItems(Array.isArray(d) ? d : []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  if (error) return null

  return (
    <section className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-16">
      <div className="flex items-baseline justify-between mb-6 flex-wrap gap-2">
        <div>
          <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            지금 뜨는 메뉴
          </span>
          <h2 className="text-base sm:text-lg font-semibold mt-0.5">
            요즘 검색량이 가장 빠르게 오르는 메뉴
          </h2>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">
          최근 4주 vs 이전 4주
        </span>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : items && items.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((it, i) => {
            const meta = ITEM_TYPE_LABEL[it.itemType] ?? ITEM_TYPE_LABEL.stable
            const deltaColor =
              it.delta > 5  ? 'var(--color-go)' :
              it.delta < -5 ? 'var(--color-stop)' :
              'var(--color-muted-foreground)'
            return (
              <motion.button
                key={it.keyword}
                type="button"
                onClick={() => navigate(`/result/${encodeURIComponent(it.keyword)}`)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                whileHover={{ y: -2 }}
                className="bg-card border border-border rounded-2xl p-4 text-left hover:border-foreground/20 transition-colors flex flex-col gap-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-muted-foreground text-xs shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="font-semibold text-sm truncate">{it.keyword}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] shrink-0"
                    style={{ color: meta.color, borderColor: meta.color }}
                  >
                    {meta.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="font-mono" style={{ color: deltaColor }}>
                    {it.delta > 0 ? '+' : ''}{it.delta.toFixed(1)}pt
                  </span>
                  <span className="text-muted-foreground">현재 <span className="font-mono">{it.current}</span></span>
                  <span className="text-muted-foreground ml-auto">
                    위험도 <span className="font-mono">{it.riskScore}</span>
                  </span>
                </div>
              </motion.button>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-8">
          트렌딩 데이터를 불러오지 못했습니다.
        </p>
      )}
    </section>
  )
}
