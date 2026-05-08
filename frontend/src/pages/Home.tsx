import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAnalysis } from '@/store/analysis'

const EXAMPLES = [
  '두바이초콜릿', '탕후루', '크로플', '마라탕', '흑당버블티',
  '카이막', '베이글', '도넛', '하이볼', '양꼬치',
]

const FEATURES = [
  {
    icon: '📉',
    title: 'EXIT 타이밍',
    desc: '검색량이 정점 대비 50% 이하로 떨어지는 예상 주차를 계산합니다.',
  },
  {
    icon: '📊',
    title: '쇼핑 수요 분석',
    desc: '검색량과 쇼핑 클릭을 동시에 추적해 진짜 구매 시그널을 봅니다.',
  },
  {
    icon: '💰',
    title: '손익분기 계산',
    desc: 'EXIT 전까지 얼마나 벌 수 있는지 주차별로 시뮬레이션합니다.',
  },
]

export default function Home() {
  const { lastKeyword, setLastKeyword } = useAnalysis()
  const navigate = useNavigate()

  function go(kw?: string) {
    const target = (kw ?? lastKeyword).trim()
    if (!target) return
    setLastKeyword(target)
    navigate(`/result/${encodeURIComponent(target)}`)
  }

  return (
    <div className="flex flex-col">

      {/* ── 풀스크린 히어로 ── */}
      <section className="min-h-[calc(100svh-3.5rem)] flex flex-col items-center justify-center text-center px-4 py-12 relative overflow-hidden">

        {/* 배경 그라디언트 */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-background to-secondary/40" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] -z-10 rounded-full bg-[var(--color-stop-bg)] opacity-30 blur-3xl" />

        {/* 상단 배지 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
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
          <div className="flex gap-2 p-1.5 bg-card border border-border rounded-2xl shadow-sm">
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
              className="h-10 px-5 rounded-xl shrink-0"
            >
              진단 시작 →
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
          ↓ 더 알아보기
        </motion.div>
      </section>

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
          {FEATURES.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              whileHover={{ y: -3 }}
              className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-2 hover:border-foreground/20 transition-colors"
            >
              <span className="text-2xl">{item.icon}</span>
              <p className="font-semibold text-sm">{item.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── 시뮬레이터 CTA ── */}
      <section className="bg-secondary/30 border-t border-border py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs text-muted-foreground mb-1">손익분기 시뮬레이터</p>
          <p className="font-semibold text-sm sm:text-base mb-4">
            EXIT 타이밍 안에 얼마나 벌 수 있을까요?
          </p>
          <Button variant="outline" onClick={() => navigate('/simulate')}>
            시뮬레이터 열기 →
          </Button>
        </div>
      </section>

    </div>
  )
}
