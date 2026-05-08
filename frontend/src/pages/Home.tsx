import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const EXAMPLES = ['두바이초콜릿', '흑당버블티', '탕후루', '크로플', '마라탕', '티라미수']

const STATS = [
  { value: '12주', label: '트렌드 분석 기간' },
  { value: '6개', label: '과거 실패 사례' },
  { value: 'AI', label: 'Claude 통합 판정' },
]

export default function Home() {
  const [keyword, setKeyword] = useState('')
  const navigate = useNavigate()

  function onAnalyze() {
    const kw = keyword.trim()
    if (!kw) return
    navigate(`/result/${encodeURIComponent(kw)}`)
  }

  return (
    <div className="flex flex-col">

      {/* ── 히어로 ── */}
      <section className="flex flex-col items-center justify-center text-center px-4 pt-20 pb-16 sm:pt-28 sm:pb-20">
        <div className="inline-flex items-center gap-2 text-xs text-muted-foreground border border-border rounded-full px-3 py-1 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-stop)]" />
          트렌드 메뉴 따라 창업했다가 재고만 남긴 카페들을 위해
        </div>

        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4 leading-tight">
          지금 이 메뉴,<br />
          <span className="text-[var(--color-stop)]">EXIT</span> 타이밍은 언제일까요?
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-md mb-10 leading-relaxed">
          네이버 검색 트렌드 + AI 분석으로<br className="sm:hidden" /> GO / WAIT / STOP을 5초 안에 판정합니다.
        </p>

        {/* 검색 박스 */}
        <div className="w-full max-w-md flex flex-col gap-3">
          <div className="flex gap-2">
            <Input
              placeholder="메뉴 키워드 입력 (예: 두바이초콜릿)"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onAnalyze()}
              className="flex-1 h-11 text-sm"
              autoFocus
            />
            <Button
              onClick={onAnalyze}
              disabled={!keyword.trim()}
              className="h-11 px-5 shrink-0"
            >
              분석하기
            </Button>
          </div>

          {/* 예시 키워드 */}
          <div className="flex flex-wrap gap-1.5 justify-center">
            {EXAMPLES.map((kw) => (
              <button
                key={kw}
                type="button"
                onClick={() => navigate(`/result/${encodeURIComponent(kw)}`)}
                className="text-[11px] px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
              >
                {kw}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── 통계 배지 ── */}
      <section className="border-y border-border py-6">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex justify-around">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-mono font-bold text-xl sm:text-2xl">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 기능 카드 3개 ── */}
      <section className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-16">
        <h2 className="text-base font-semibold text-center mb-8">ExEAT이 알려주는 것</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: '📉',
              title: 'EXIT 타이밍',
              desc: '검색량이 정점 대비 50% 이하로 떨어지는 예상 주차를 계산합니다.',
              verdict: 'STOP',
            },
            {
              icon: '📊',
              title: '쇼핑 수요 분석',
              desc: '검색량과 쇼핑 클릭을 동시에 추적해 진짜 구매 시그널을 봅니다.',
              verdict: 'WAIT',
            },
            {
              icon: '💰',
              title: '손익분기 계산',
              desc: 'EXIT 전까지 얼마나 벌 수 있는지 주차별로 시뮬레이션합니다.',
              verdict: 'GO',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="border border-border rounded-2xl p-5 flex flex-col gap-2 hover:bg-secondary/50 transition-colors"
            >
              <span className="text-2xl">{item.icon}</span>
              <p className="font-semibold text-sm">{item.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 실패 사례 티저 ── */}
      <section className="bg-secondary/40 border-t border-border py-10 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs text-muted-foreground mb-1">실패 사례 라이브러리</p>
          <p className="font-semibold text-sm sm:text-base mb-4">
            대만카스테라·탕후루·흑당버블티... 왜 다 망했을까?
          </p>
          <Button
            variant="outline"
            onClick={() => navigate('/cases')}
          >
            사례 보러 가기 →
          </Button>
        </div>
      </section>

    </div>
  )
}
