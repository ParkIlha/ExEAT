import { useLocation } from 'react-router-dom'
import Simulator from '@/components/Simulator'

export default function Simulate() {
  const location = useLocation()
  const exitWeek = (location.state as { exitWeek?: number | null } | null)?.exitWeek ?? null

  return (
    <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10 flex flex-col gap-6">

      <div className="flex flex-col gap-1">
        <span className="text-[11px] text-muted-foreground uppercase tracking-widest">
          F6 · Simulator
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">손익분기 시뮬레이터</h1>
        <p className="text-sm text-muted-foreground mt-1">
          재료비·판매가·판매량을 입력하면 EXIT 전까지 얼마나 벌 수 있는지 계산합니다.
        </p>
      </div>

      {exitWeek && (
        <div className="flex items-center gap-2 text-xs border border-border rounded-xl px-3 py-2 bg-secondary self-start">
          <span className="font-mono">분석 결과 EXIT</span>
          <strong className="font-mono text-[var(--color-stop)]">{exitWeek}주 후</strong>
          <span className="text-muted-foreground">자동 적용됨</span>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl p-5">
        <Simulator defaultExitWeek={exitWeek} />
      </div>

      <div className="border border-border rounded-2xl p-5 bg-card">
        <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-3">
          계산 방식
        </p>
        <ul className="text-xs text-muted-foreground flex flex-col gap-1.5">
          <li>· 주간 수익 = (판매가 − 재료비) × 일 판매량 × 7</li>
          <li>· 손익분기 = 초기 고정비 ÷ 주간 수익</li>
          <li>· EXIT 전 누적 = exitWeek까지의 주간 수익 합산 − 초기 고정비</li>
          <li>· EXIT 주차는 트렌드 분석 결과에서 자동 연동</li>
        </ul>
      </div>

    </div>
  )
}
