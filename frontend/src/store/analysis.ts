import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type TrendPoint = { period: string; ratio: number }
export type Verdict = 'GO' | 'WAIT' | 'STOP'
export type Stage = 'rising' | 'peak' | 'declining' | 'stable'

export type ForecastPoint = { week: number; ratio: number }
export type ItemType = 'trending' | 'classic' | 'seasonal' | 'growing' | 'fading' | 'niche' | 'stable'

export type ActionPlan = {
  immediate:    string[]
  shortterm:    string[]
  midterm:      string[]
  worstCase:    string
  alternatives: string[]
}

export type TrendingItem = {
  keyword:   string
  delta:     number
  current:   number
  peak:      number
  stage:     Stage
  itemType:  ItemType
  verdict:   Verdict
  riskScore: number
}

export type TrendResult = {
  keyword: string
  startDate: string
  endDate: string
  weeks: TrendPoint[]
  shoppingWeeks?: TrendPoint[]
  stage: Stage
  verdict: Verdict
  exitWeek: number | null
  peakWeek: number
  peakRatio: number
  currentRatio: number
  avgRecent: number
  avgPrev: number
  avgAll?: number
  momentum:        number
  volatility:      number
  peakDecay:       number
  inflectionWeek:  number | null
  forecast:        ForecastPoint[]
  riskScore:       number
  itemType?:       ItemType
  summary?:        string
  reasoning?:      string
  dataInsight?:    string
  marketContext?:  string
  actionPlan?:     ActionPlan
  aiProvider?:     'claude' | 'gemini' | 'algorithm' | 'unknown'
}

export type SimInput = {
  unitCost: string
  price: string
  dailySales: string
  fixedCost: string
}

interface AnalysisState {
  // Home 검색 입력
  lastKeyword: string
  setLastKeyword: (kw: string) => void

  // 키워드별 분석 결과 캐시 (재방문 즉시 표시)
  cache: Record<string, { data: TrendResult; ts: number }>
  getCached: (keyword: string) => TrendResult | null
  setCached: (keyword: string, data: TrendResult) => void

  // 시뮬레이터 입력 보존
  simInput: SimInput
  setSimInput: (next: Partial<SimInput>) => void
}

const CACHE_TTL = 1000 * 60 * 30  // 30분

export const useAnalysis = create<AnalysisState>()(
  persist(
    (set, get) => ({
      lastKeyword: '',
      setLastKeyword: (kw) => set({ lastKeyword: kw }),

      cache: {},
      getCached: (keyword) => {
        const entry = get().cache[keyword]
        if (!entry) return null
        if (Date.now() - entry.ts > CACHE_TTL) return null
        return entry.data
      },
      setCached: (keyword, data) =>
        set((s) => ({
          cache: { ...s.cache, [keyword]: { data, ts: Date.now() } },
        })),

      simInput: {
        unitCost:   '2500',
        price:      '6000',
        dailySales: '30',
        fixedCost:  '0',
      },
      setSimInput: (next) =>
        set((s) => ({ simInput: { ...s.simInput, ...next } })),
    }),
    { name: 'exeat-analysis' },
  ),
)
