import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Coffee, UtensilsCrossed, Soup, Croissant, Truck, ChefHat,
  ArrowRight, ArrowLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAnalysis, type BusinessType, type UserProfile } from '@/store/analysis'
import { useAuth } from '@/store/auth'

const BUSINESS_TYPES: { value: BusinessType; label: string; Icon: typeof Coffee; desc: string }[] = [
  { value: 'cafe',       label: '카페·디저트',        Icon: Coffee,          desc: '커피·음료·케이크·빙수 등' },
  { value: 'restaurant', label: '식당·이자카야',      Icon: UtensilsCrossed, desc: '한식·중식·일식·양식 등' },
  { value: 'fastfood',   label: '분식·패스트푸드',    Icon: Soup,            desc: '떡볶이·김밥·버거·치킨 등' },
  { value: 'bakery',     label: '베이커리·제과점',    Icon: Croissant,       desc: '빵·케이크·마카롱 등' },
  { value: 'foodtruck',  label: '푸드트럭·포장마차',  Icon: Truck,           desc: '이동식 판매 또는 노점' },
  { value: 'other',      label: '기타',              Icon: ChefHat,          desc: '위에 해당 없음' },
]

const REGIONS = [
  '서울', '경기', '인천', '부산', '대구', '대전', '광주', '울산',
  '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주',
]

interface Props {
  onDone: () => void
}

export default function OnboardingModal({ onDone }: Props) {
  const { setUserProfile } = useAnalysis()
  const { saveProfile } = useAuth()
  const [step, setStep] = useState<1 | 2>(1)
  const [businessType, setBusinessType] = useState<BusinessType | null>(null)
  const [region, setRegion] = useState<string | null>(null)

  function handleDone() {
    if (!businessType || !region) return
    const profile: UserProfile = { businessType, region }
    setUserProfile(profile)
    saveProfile(region, businessType)  // 로그인 상태면 DB에도 저장 (아니면 noop)
    onDone()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* 오버레이 */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onDone}
      />

      {/* 모달 */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative z-10 w-full max-w-lg fluent-card-elevated rounded-t-3xl sm:rounded-3xl p-6 sm:p-8"
        style={{ boxShadow: 'var(--shadow-32)' }}
      >
        {/* 드래그 핸들 (모바일) */}
        <div className="sm:hidden w-10 h-1 rounded-full bg-border mx-auto mb-5" />

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex items-center gap-3 mb-6">
                <img src="/logo.png" alt="ExEAT" className="w-10 h-10 object-contain" />
                <div>
                  <h2 className="font-bold text-base">처음 오셨군요</h2>
                  <p className="text-xs text-muted-foreground">어떤 업종을 운영 중이신가요?</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-6">
                {BUSINESS_TYPES.map((bt) => {
                  const selected = businessType === bt.value
                  return (
                    <button
                      key={bt.value}
                      type="button"
                      onClick={() => setBusinessType(bt.value)}
                      className={`text-left p-3 rounded-xl border transition-all ${
                        selected
                          ? 'border-foreground bg-foreground/5 ring-1 ring-foreground'
                          : 'border-border hover:border-foreground/40 hover:bg-secondary/50'
                      }`}
                    >
                      <bt.Icon className="w-5 h-5 mb-1.5" strokeWidth={1.6} />
                      <span className="text-xs font-semibold block">{bt.label}</span>
                      <span className="text-[10px] text-muted-foreground">{bt.desc}</span>
                    </button>
                  )
                })}
              </div>

              <Button
                className="w-full gap-1.5"
                disabled={!businessType}
                onClick={() => setStep(2)}
              >
                다음 <ArrowRight className="w-3.5 h-3.5" />
              </Button>

              <button
                type="button"
                onClick={onDone}
                className="w-full text-center text-xs text-muted-foreground mt-3 hover:text-foreground transition-colors"
              >
                지금은 건너뛰기
              </button>
            </motion.div>
          ) : (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-muted-foreground hover:text-foreground mb-5 inline-flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3 h-3" /> 뒤로
              </button>

              <h2 className="font-bold text-base mb-1">지역을 선택해주세요</h2>
              <p className="text-xs text-muted-foreground mb-5">
                지역 상권과 소비 패턴을 AI 분석에 반영합니다
              </p>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 mb-6">
                {REGIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRegion(r)}
                    className={`py-2 rounded-xl text-xs font-medium transition-all ${
                      region === r
                        ? 'bg-foreground text-background'
                        : 'bg-secondary hover:bg-secondary/80 text-foreground'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <Button
                className="w-full gap-1.5"
                disabled={!region}
                onClick={handleDone}
              >
                분석 시작하기 <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
