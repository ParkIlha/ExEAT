import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import CaseLibrary from '@/components/CaseLibrary'

const PATTERNS = [
  { value: null,                label: '전체' },
  { value: 'sudden_rise_fall',  label: '급등 후 급락' },
  { value: 'gradual_decline',   label: '완만한 하락' },
  { value: 'steady',            label: '장기 안정' },
  { value: 'seasonal',          label: '계절 반복' },
]

export default function Cases() {
  const [pattern, setPattern] = useState<string | null>(null)

  return (
    <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-4">

      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold">과거 사례 라이브러리</h1>
        <p className="text-sm text-muted-foreground">
          트렌드 메뉴 실패 사례를 패턴별로 분석합니다. 같은 실수를 반복하지 마세요.
        </p>
      </div>

      {/* 패턴 필터 탭 */}
      <div className="flex gap-2 flex-wrap">
        {PATTERNS.map((p) => (
          <button
            key={String(p.value)}
            type="button"
            onClick={() => setPattern(p.value)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              pattern === p.value
                ? 'bg-foreground text-background border-foreground'
                : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base font-semibold">
            {PATTERNS.find((p) => p.value === pattern)?.label ?? '전체'} 사례
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CaseLibrary pattern={pattern} />
        </CardContent>
      </Card>

      {/* 교훈 요약 */}
      <div className="border border-border rounded-2xl p-4 flex flex-col gap-3">
        <p className="text-xs font-medium">공통 교훈</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: '📈', title: '정점 진입 금물', desc: '검색량이 최고점일 때 창업하면 이미 늦었습니다.' },
            { icon: '📦', title: '재고 미리 줄이기', desc: 'STOP 판정 시 신규 재고 주문을 즉시 중단하세요.' },
            { icon: '⏱', title: '6~8주 리드타임', desc: '트렌드 하락 시작 후 실제 매출 타격까지 평균 6주.' },
          ].map((item) => (
            <div key={item.title} className="bg-secondary rounded-xl p-3 flex flex-col gap-1">
              <span className="text-lg">{item.icon}</span>
              <p className="text-xs font-medium">{item.title}</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
