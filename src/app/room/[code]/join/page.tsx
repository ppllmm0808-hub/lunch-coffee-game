'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function JoinPage({ params }: { params: { code: string } }) {
  const { code } = params
  const router = useRouter()
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleJoin() {
    if (!nickname.trim()) { setError('닉네임을 입력하세요'); return }
    setLoading(true); setError('')
    const res = await fetch('/api/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode: code, nickname: nickname.trim() }),
    })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error || '입장 실패')
      setLoading(false)
      return
    }
    const { player } = await res.json()
    localStorage.setItem(`player-${code}`, JSON.stringify(player))
    router.push(`/room/${code}/wait`)
  }

  return (
    <main style={{ maxWidth: 360, margin: '0 auto', padding: '3rem 1.5rem', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: 44, marginBottom: 10 }}>🍱</div>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>방 입장</h1>
        <p style={{ fontSize: 14, color: '#888', marginTop: 8 }}>
          방 코드 <strong style={{ color: '#534AB7', letterSpacing: 2 }}>{code}</strong>
        </p>
      </div>

      <label style={{ fontSize: 13, color: '#555' }}>닉네임</label>
      <input
        value={nickname}
        onChange={e => setNickname(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleJoin()}
        maxLength={8}
        placeholder="최대 8자"
        autoFocus
        style={{ width: '100%', padding: '12px 14px', fontSize: 16, marginTop: 6, marginBottom: 20, borderRadius: 8, border: '1.5px solid #ddd', boxSizing: 'border-box', outline: 'none' }}
      />

      {error && <p style={{ color: '#E24B4A', fontSize: 13, marginBottom: 12 }}>{error}</p>}

      <button
        onClick={handleJoin}
        disabled={loading}
        style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', background: '#534AB7', color: '#fff', fontSize: 16, fontWeight: 500, opacity: loading ? 0.6 : 1 }}
      >
        {loading ? '입장 중...' : '입장하기'}
      </button>
    </main>
  )
}
