import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type TrendPoint = { period: string; ratio: number }
export type Verdict = 'GO' | 'WAIT' | 'STOP'
export type Stage = 'rising' | 'peak' | 'declining' | 'stable'

export type ForecastPoint = { week: number; ratio: number }
export type ItemType =
  | 'trending' | 'classic' | 'seasonal' | 'growing' | 'fading' | 'niche' | 'stable'
  | 'steady_saturated' | 'steady_safe' | 'steady_emerging'


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

export type BuzzLevel  = 'high' | 'medium' | 'low'
export type MediaLevel = 'high' | 'medium' | 'low'
export type DivergenceType = 'bubble' | 'confirmed' | 'loyal' | 'media_driven' | 'neutral'

export type BlogData = { total: number; buzzLevel: BuzzLevel }
export type NewsData = { total: number; mediaLevel: MediaLevel }
export type SignalDivergence = {
  type:         DivergenceType
  signalsUp:    number
  signalsDown:  number
  signalsTotal: number
}

export type TrendResult = {
  keyword: string
  startDate: string
  endDate: string
  weeks: TrendPoint[]
  shoppingWeeks?:    TrendPoint[]
  googleWeeks?:      TrendPoint[]
  blogData?:         BlogData
  newsData?:         NewsData
  signalDivergence?: SignalDivergence
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
  itemType?:             ItemType
  saturationScore?:      number
  differentiationDifficulty?: string
  entryVerdict?:         string
  summary?:              string
  reasoning?:      string
  dataInsight?:    string
  marketContext?:  string
  actionPlan?:     ActionPlan
  aiProvider?:     'claude' | 'gemini' | 'algorithm' | 'unknown'
}

export type BusinessType =
  | 'cafe'       // 카페·디저트
  | 'restaurant' // 한식·중식·일식 등 일반 식당
  | 'fastfood'   // 분식·패스트푸드
  | 'foodtruck'  // 푸드트럭·포장마차
  | 'bakery'     // 베이커리·제과점
  | 'other'

export type UserProfile = {
  businessType: BusinessType
  region: string   // 예: '서울', '경기', '부산'
}

export type SimInput = {
  unitCost: string
  price: string
  dailySales: string
  fixedCost: string
}

interface AnalysisState {
  // 사용자 프로필 (업종 + 지역)
  userProfile: UserProfile | null
  setUserProfile: (profile: UserProfile) => void

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
      userProfile: null,
      setUserProfile: (profile) => set({ userProfile: profile }),

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
    {
      name: 'exeat-analysis',
      version: 2,
      migrate: (persisted, ver) => {
        const s = (persisted ?? {}) as Partial<AnalysisState>
        if (ver < 2) return { ...s, cache: {} }
        return persisted as AnalysisState
      },
    },
  ),
)
