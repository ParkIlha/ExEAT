import { useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/store/auth'

interface Props {
  open: boolean
  onClose: () => void
}

export default function LoginModal({ open, onClose }: Props) {
  const setSession = useAuth((s) => s.setSession)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  async function submit() {
    setError('')
    setLoading(true)
    try {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const r = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const j = (await r.json()) as { token?: string; user?: { email?: string }; error?: string }
      if (!r.ok) {
        setError(j.error ?? '요청에 실패했습니다.')
        return
      }
      if (j.token && j.user?.email) {
        setSession(j.token, j.user.email)
        onClose()
        setEmail('')
        setPassword('')
      }
    } catch {
      setError('네트워크 오류입니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-xl"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-lg">{mode === 'login' ? '로그인' : '회원가입'}</h2>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-1 p-1 rounded-xl bg-secondary mb-4">
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError('') }}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                mode === m ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
              }`}
            >
              {m === 'login' ? '로그인' : '회원가입'}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 mb-4">
          <div>
            <label className="text-[11px] text-muted-foreground">이메일</label>
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">비밀번호 (6자 이상)</label>
            <Input
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1"
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          </div>
        </div>

        {error && (
          <p className="text-xs text-[var(--color-stop)] mb-3">{error}</p>
        )}

        <Button className="w-full" disabled={loading || !email.trim() || password.length < 6} onClick={submit}>
          {loading ? '처리 중…' : mode === 'login' ? '로그인' : '가입 후 로그인'}
        </Button>

        <p className="text-[10px] text-muted-foreground mt-4 leading-relaxed">
          로그인 시 분석한 메뉴 이력이 서버에 저장됩니다. 향후 유료 플랜·일일 한도 연동 시 계정 기준으로 적용할 수 있습니다.
        </p>
      </motion.div>
    </div>
  )
}
