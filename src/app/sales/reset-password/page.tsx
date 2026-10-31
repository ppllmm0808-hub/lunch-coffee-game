'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { salesSupabase } from '@/lib/sales-supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // URL 해시에서 토큰을 처리
    salesSupabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
      else router.replace('/sales/login')
    })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('비밀번호가 일치하지 않습니다.'); return }
    if (password.length < 6) { setError('비밀번호는 6자 이상이어야 합니다.'); return }
    setLoading(true)
    const { error } = await salesSupabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    router.replace('/sales/dashboard')
  }

  if (!ready) return (
    <div style={{ minHeight: '100vh', background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#fff' }}>로딩 중...</p>
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20,
        padding: '48px 40px', width: '100%', maxWidth: 400,
      }}>
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>새 비밀번호 설정</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', marginBottom: 32 }}>영업활동일지 비밀번호를 설정하세요</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input
            type="password" placeholder="새 비밀번호 (6자 이상)" value={password}
            onChange={e => setPassword(e.target.value)} required minLength={6}
            style={inputStyle}
          />
          <input
            type="password" placeholder="비밀번호 확인" value={confirm}
            onChange={e => setConfirm(e.target.value)} required
            style={inputStyle}
          />
          {error && <p style={{ color: '#ff6b6b', fontSize: 13, textAlign: 'center' }}>{error}</p>}
          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? '처리 중...' : '비밀번호 설정'}
          </button>
        </form>
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
