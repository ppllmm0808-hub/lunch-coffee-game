'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { salesSupabase } from '@/lib/sales-supabase'

export default function SalesLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (isSignUp) {
      const { error } = await salesSupabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      })
      if (error) { setError(error.message); setLoading(false); return }
      setError('이메일 확인 후 로그인하세요.')
    } else {
      const { error } = await salesSupabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      router.push('/sales/dashboard')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      fontFamily: 'Pretendard, -apple-system, sans-serif',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20,
        padding: '48px 40px', width: '100%', maxWidth: 400,
      }}>
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>
          영업활동일지
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', marginBottom: 32 }}>
          {isSignUp ? '새 계정 만들기' : '로그인하여 시작하세요'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {isSignUp && (
            <input
              type="text" placeholder="이름" value={name}
              onChange={e => setName(e.target.value)} required
              style={inputStyle}
            />
          )}
          <input
            type="email" placeholder="이메일" value={email}
            onChange={e => setEmail(e.target.value)} required
            style={inputStyle}
          />
          <input
            type="password" placeholder="비밀번호 (6자 이상)" value={password}
            onChange={e => setPassword(e.target.value)} required minLength={6}
            style={inputStyle}
          />

          {error && (
            <p style={{ color: '#ff6b6b', fontSize: 13, textAlign: 'center' }}>{error}</p>
          )}

          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? '처리 중...' : isSignUp ? '회원가입' : '로그인'}
          </button>
        </form>

        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', marginTop: 24 }}>
          {isSignUp ? '이미 계정이 있나요?' : '계정이 없으신가요?'}{' '}
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError('') }}
            style={{ color: '#4fc3f7', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}
          >
            {isSignUp ? '로그인' : '회원가입'}
          </button>
        </p>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 10, padding: '12px 16px', color: '#fff', fontSize: 15, outline: 'none',
}

const btnStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #4fc3f7, #0288d1)',
  border: 'none', borderRadius: 10, padding: '14px', color: '#fff',
  fontSize: 16, fontWeight: 600, cursor: 'pointer', marginTop: 8,
}
