import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, User, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { TrendResult } from '@/store/analysis'

type Message = {
  role: 'user' | 'assistant'
  text: string
}

const QUICK_QUESTIONS = [
  '지금 바로 시작해도 될까요?',
  '이 메뉴로 월 수익은 얼마나 될까요?',
  '경쟁이 많은 지역에서도 괜찮을까요?',
  '어떤 차별화 전략이 효과적일까요?',
]

interface Props {
  data: TrendResult
}

export default function AnalysisChat({ data }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(question?: string) {
    const q = (question ?? input).trim()
    if (!q || loading) return

    const userMsg: Message = { role: 'user', text: q }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: data.keyword,
          question: q,
          context: {
            verdict:     data.verdict,
            nature:      data.nature,
            cycle:       data.cycle,
            stage:       data.stage,
            riskScore:   data.riskScore,
            itemType:    data.itemType,
            exitWeek:    data.exitWeek,
            isSeasonal:  data.isSeasonal,
            seasonPhase: data.seasonPhase,
            startupCost: data.startupCost,
            summary:     data.summary,
          },
        }),
      })
      const j = await r.json() as { answer?: string; error?: string }
      const answer = j.answer || j.error || '답변을 가져오지 못했습니다.'
      setMessages(prev => [...prev, { role: 'assistant', text: answer }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: '네트워크 오류가 발생했습니다.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fluent-card rounded-2xl overflow-hidden border-2 border-border">
      {/* 헤더 */}
      <div className="px-5 py-4 border-b border-border flex items-center gap-3 bg-foreground/[0.02]">
        <div className="w-9 h-9 rounded-xl bg-[#E8510A]/10 flex items-center justify-center shrink-0">
          <Sparkles className="w-4.5 h-4.5 text-[#E8510A]" strokeWidth={2} />
        </div>
        <div>
          <p className="text-base font-semibold">AI 컨설턴트에게 물어보기</p>
          <p className="text-xs text-muted-foreground">
            {data.keyword} 분석 결과를 바탕으로 창업·운영에 관한 무엇이든 질문하세요
          </p>
        </div>
        <span className="ml-auto text-xs font-mono text-muted-foreground px-2 py-1 border border-border rounded-full shrink-0">
          Gemini
        </span>
      </div>

      {/* 대화 영역 */}
      <div className="px-4 py-4 flex flex-col gap-3 min-h-48 max-h-[480px] overflow-y-auto">
        {messages.length === 0 && (
          <div className="text-center py-4">
            <Bot className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-xs text-muted-foreground">
              분석 결과에 대해 궁금한 점을 물어보세요
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <div className="shrink-0 w-6 h-6 rounded-full bg-foreground/8 flex items-center justify-center mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-foreground/60" strokeWidth={2} />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-foreground text-background rounded-tr-sm'
                    : 'bg-secondary text-foreground rounded-tl-sm'
                }`}
              >
                {m.text}
              </div>
              {m.role === 'user' && (
                <div className="shrink-0 w-6 h-6 rounded-full bg-foreground flex items-center justify-center mt-0.5">
                  <User className="w-3.5 h-3.5 text-background" strokeWidth={2} />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-2.5 justify-start"
          >
            <div className="shrink-0 w-6 h-6 rounded-full bg-foreground/8 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-foreground/60" strokeWidth={2} />
            </div>
            <div className="bg-secondary rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 items-center">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 빠른 질문 버튼 (첫 질문 전에만 표시) */}
      {messages.length === 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          {QUICK_QUESTIONS.map(q => (
            <button
              key={q}
              type="button"
              onClick={() => send(q)}
              disabled={loading}
              className="text-xs px-3 py-2 rounded-full border border-border hover:border-[#E8510A] hover:text-[#E8510A] transition-colors text-muted-foreground disabled:opacity-40"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* 입력창 */}
      <div className="px-4 pb-4 flex flex-col gap-1.5">
        <p className="text-xs text-muted-foreground px-1">
          💡 <span className="font-medium">지역·업종·초기 자본</span> 등 구체적인 정보를 함께 입력하면 더 정확한 답변을 받을 수 있어요.
        </p>
        <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="예) 서울 홍대, 초기 자본 3000만원, 1인 카페 창업 예정인데 빙수 가능할까요?"
          disabled={loading}
          className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#E8510A]/30 focus:border-[#E8510A]/50 disabled:opacity-50"
        />
        <Button
          size="sm"
          onClick={() => send()}
          disabled={!input.trim() || loading}
          className="shrink-0 rounded-xl h-11 w-11 p-0 bg-[#E8510A] hover:bg-[#d44800]"
        >
          <Send className="w-4 h-4" />
        </Button>
        </div>
      </div>
    </div>
  )
}
