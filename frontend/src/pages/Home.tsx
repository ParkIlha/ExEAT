import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  TrendingDown, BarChart3, Wallet, AlertCircle, ChevronDown, ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import TrendingSection from '@/components/TrendingSection'
import OnboardingModal from '@/components/OnboardingModal'
import { useAnalysis } from '@/store/analysis'

const EXAMPLES = [
  '우베', '흑임자라떼', '말차', '크로플', '마라탕',
  '베이글', '도넛', '하이볼', '로제파스타', '마라샹궈',
  '치킨', '떡볶이', '파스타', '타르트', '크룽지',
]

// 실제 폐업/트렌드 붕괴 사례 데이터
const CRISIS_CASES = [
  {
    menu: '탕후루',
    peak: '2023년 8월',
    stat: '2,500개',
    statLabel: '전국 가맹점',
    outcome: '6개월 내 절반 폐업',
    color: 'var(--color-stop)',
  },
  {
    menu: '대만 카스테라',
    peak: '2017년',
    stat: '500+',
    statLabel: '프랜차이즈 가맹점',
    outcome: '1년 내 시장 붕괴',
    color: 'var(--color-stop)',
  },
  {
    menu: '두바이 초콜릿',
    peak: '2024년 상반기',
    stat: '-85%',
    statLabel: '피크 후 6개월 검색량',
    outcome: '2025년 재고 처리 대란',
    color: 'var(--color-wait)',
  },
]

const FEATURES = [
  {
    Icon: TrendingDown,
    title: 'EXIT 타이밍',
    desc: '검색량이 정점 대비 50% 이하로 떨어지는 예상 주차를 계산합니다.',
  },
  {
    Icon: BarChart3,
    title: '쇼핑 수요 분석',
    desc: '검색량과 쇼핑 클릭을 동시에 추적해 진짜 구매 시그널을 봅니다.',
  },
  {
    Icon: Wallet,
    title: '손익분기 계산',
    desc: 'EXIT 전까지 얼마나 벌 수 있는지 주차별로 시뮬레이션합니다.',
  },
]

export default function Home() {
  const { lastKeyword, setLastKeyword, userProfile } = useAnalysis()
  const navigate = useNavigate()
  const [showOnboarding, setShowOnboarding] = useState(!userProfile)

  function go(kw?: string) {
    const target = (kw ?? lastKeyword).trim()
    if (!target) return
    setLastKeyword(target)
    navigate(`/result/${encodeURIComponent(target)}`)
  }

  return (
    <div className="flex flex-col">
      {showOnboarding && (
        <OnboardingModal onDone={() => setShowOnboarding(false)} />
      )}

      {/* ── 풀스크린 히어로 ── */}
      <section className="min-h-[calc(100svh-3.5rem)] flex flex-col items-center justify-center text-center px-4 py-12 relative overflow-hidden">

        {/* 배경 그라디언트 */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-background to-secondary/40" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] -z-10 rounded-full bg-[var(--color-stop-bg)] opacity-30 blur-3xl" />

        {/* 상단 배지 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="inline-flex items-center gap-2 text-[11px] sm:text-xs text-muted-foreground border border-border bg-background/80 backdrop-blur rounded-full px-3 py-1.5 mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-stop)]" />
          트렌드 메뉴 따라 들였다가 재고만 남긴 외식업 사장님들을 위해
        </motion.div>

        {/* 메인 카피 */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="text-3xl sm:text-5xl font-bold tracking-tight mb-5 leading-[1.15]"
        >
          이 메뉴, 지금 들여도<br />
          괜찮은 <span className="text-[var(--color-stop)]">타이밍</span>일까?
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-sm sm:text-base text-muted-foreground max-w-md mb-10 leading-relaxed"
        >
          외식 트렌드 데이터 + AI 분석으로<br className="sm:hidden" /> GO / WAIT / STOP을 5초 안에 판정합니다.
        </motion.p>

        {/* 검색 박스 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="w-full max-w-md flex flex-col gap-4"
        >
          <div className="flex gap-2 p-1.5 fluent-card rounded-2xl" style={{ boxShadow: 'var(--shadow-8)' }}>
            <Input
              placeholder="메뉴 키워드 입력"
              value={lastKeyword}
              onChange={(e) => setLastKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && go()}
              className="flex-1 h-10 text-sm border-0 shadow-none focus-visible:ring-0 bg-transparent"
              autoFocus
            />
            <Button
              onClick={() => go()}
              disabled={!lastKeyword.trim()}
              className="h-10 px-5 rounded-xl shrink-0 gap-1.5"
            >
              진단 시작 <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* 예시 키워드 */}
          <div className="flex flex-wrap gap-1.5 justify-center">
            {EXAMPLES.map((kw, i) => (
              <motion.button
                key={kw}
                type="button"
                onClick={() => go(kw)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 + i * 0.04 }}
                whileHover={{ y: -2 }}
                className="text-[11px] px-3 py-1.5 rounded-full bg-card border border-border text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
              >
                {kw}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* 스크롤 힌트 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5, y: [0, 6, 0] }}
          transition={{ delay: 0.8, duration: 2, repeat: Infinity }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground"
        >
          <span className="inline-flex items-center gap-1"><ChevronDown className="w-3 h-3" /> 더 알아보기</span>
        </motion.div>
      </section>

      {/* ── 구조적 문제 섹션 ── */}
      <section className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-16 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--color-stop)] font-medium border border-[var(--color-stop)]/30 bg-[var(--color-stop-bg)] rounded-full px-3 py-1 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-stop)]" />
            대중문화의 구조적 문제
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-3">
            트렌드는 <span className="text-[var(--color-stop)]">대기업이 만들고</span>,<br />
            피해는 <span className="text-[var(--color-stop)]">소상공인이 받습니다</span>
          </h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
            SNS·미디어가 음식 트렌드를 폭발적으로 키우지만, 정작 언제 빠져나와야 할지 
            알려주는 데이터는 <strong>대형 프랜차이즈 본사만</strong> 갖고 있습니다.
          </p>
        </motion.div>

        {/* 사례 카드 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
          {CRISIS_CASES.map((c, i) => (
            <motion.div
              key={c.menu}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="fluent-card rounded-2xl p-5 relative overflow-hidden"
            >
              <div
                className="absolute inset-0 opacity-[0.04] pointer-events-none"
                style={{ background: `radial-gradient(ellipse at 0% 0%, ${c.color} 0%, transparent 70%)` }}
              />
              <p className="text-xs text-muted-foreground mb-1">{c.peak} 정점</p>
              <p className="font-bold text-sm mb-3">{c.menu}</p>
              <p className="font-mono font-black text-2xl sm:text-3xl mb-0.5" style={{ color: c.color }}>{c.stat}</p>
              <p className="text-[10px] text-muted-foreground mb-2">{c.statLabel}</p>
              <div
                className="text-[11px] font-medium px-2 py-1 rounded-md inline-block"
                style={{ color: c.color, backgroundColor: c.color + '15' }}
              >
                {c.outcome}
              </div>
            </motion.div>
          ))}
        </div>

        {/* 정보 비대칭 강조 */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="fluent-card rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4"
          style={{ boxShadow: 'var(--shadow-8)' }}
        >
          <div
            className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-stop-bg)' }}
          >
            <AlertCircle className="w-6 h-6" style={{ color: 'var(--color-stop)' }} />
          </div>
          <div>
            <p className="font-semibold text-sm mb-1">정보 비대칭이 문제입니다</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              대형 프랜차이즈는 데이터 분석팀이 있습니다. 소상공인은 SNS와 감으로만 판단합니다.
              ExEAT은 이 격차를 좁히기 위해 만든 <strong>무료 EXIT 타이밍 진단 도구</strong>입니다.
            </p>
          </div>
        </motion.div>
      </section>

      {/* ── 요즘 뜨는 메뉴 ── */}
      <TrendingSection />

      {/* ── 기능 카드 3개 ── */}
      <section className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-16 sm:py-20">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.4 }}
          className="text-base sm:text-lg font-semibold text-center mb-2"
        >
          ExEAT이 알려주는 것
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="text-xs sm:text-sm text-muted-foreground text-center mb-10"
        >
          단순 검색량이 아닌, EXIT 타이밍에 집중한 진단 도구
        </motion.p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {FEATURES.map((item, i) => {
            const Icon = item.Icon
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                whileHover={{ y: -3 }}
                className="fluent-card rounded-2xl p-5 flex flex-col gap-3"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'var(--color-secondary)' }}
                >
                  <Icon className="w-4.5 h-4.5" strokeWidth={1.8} />
                </div>
                <p className="font-semibold text-sm">{item.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* ── 시뮬레이터 CTA ── */}
      <section className="bg-secondary/30 border-t border-border py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs text-muted-foreground mb-1">손익분기 시뮬레이터</p>
          <p className="font-semibold text-sm sm:text-base mb-4">
            EXIT 타이밍 안에 얼마나 벌 수 있을까요?
          </p>
          <Button variant="outline" onClick={() => navigate('/simulate')} className="gap-1.5">
            시뮬레이터 열기 <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </section>

    </div>
  )
}
