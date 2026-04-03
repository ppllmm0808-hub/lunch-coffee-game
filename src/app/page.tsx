'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { GamePackRegistry } from '@/lib/game-pack.registry'

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 12px', fontSize: 16, marginTop: 6,
  borderRadius: 8, border: '1.5px solid var(--color-border-secondary)',
  background: 'var(--color-background-primary)', color: 'var(--color-text-primary)',
  boxSizing: 'border-box',
}

export default function HomePage() {
  const router = useRouter()
  const [tab, setTab]       = useState<'create'|'join'>('create')
  const [hostName, setHostName] = useState('')
  const [amount, setAmount]   = useState('35000')
  const [joinCode, setJoinCode] = useState('')
  const [joinNick, setJoinNick] = useState('')
  const [loading, setLoading]  = useState(false)
  const [error, setError]     = useState('')

  const pack = GamePackRegistry.getOrThrow('lunch-sagi')

  async function handleCreate() {
    if (!hostName.trim()) { setError('닉네임을 입력하세요'); return }
    setLoading(true); setError('')
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gamePackId: pack.meta.id, hostName: hostName.trim(), totalAmount: parseInt(amount)||35000 }),
    })
    if (!res.ok) { setError('방 생성 실패'); setLoading(false); return }
    const { room, player } = await res.json()
    localStorage.setItem(`player-${room.code}`, JSON.stringify(player))
    router.push(`/room/${room.code}/wait`)
  }

  async function handleJoin() {
    if (!joinNick.trim()||!joinCode.trim()) { setError('코드와 닉네임을 입력하세요'); return }
    setLoading(true); setError('')
    const code = joinCode.trim().toUpperCase()
    const res = await fetch('/api/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode: code, nickname: joinNick.trim() }),
    })
    if (!res.ok) { const d = await res.json(); setError(d.error||'입장 실패'); setLoading(false); return }
    const { player } = await res.json()
    localStorage.setItem(`player-${code}`, JSON.stringify(player))
    router.push(`/room/${code}/wait`)
  }

  return (
    <main style={{ maxWidth: 400, margin: '0 auto', padding: '2rem 1rem', fontFamily: 'var(--font-sans)' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>{pack.meta.emoji}</div>
        <h1 style={{ fontSize: 24, fontWeight: 500, margin: 0 }}>{pack.meta.name}</h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginTop: 6 }}>{pack.meta.description}</p>
        <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
          {pack.meta.minPlayers}~{pack.meta.maxPlayers}명 · {pack.meta.roundCount}라운드 · 약 {pack.meta.estimatedMinutes}분
        </p>
      </div>

      <div style={{ display:'flex', marginBottom:16, border:'0.5px solid var(--color-border-tertiary)', borderRadius:10, overflow:'hidden' }}>
        {(['create','join'] as const).map(t => (
          <button key={t} onClick={()=>setTab(t)} style={{ flex:1, padding:'10px 0', border:'none', cursor:'pointer', fontSize:14, fontWeight:500, background: tab===t ? '#534AB7' : 'transparent', color: tab===t ? '#fff' : 'var(--color-text-secondary)', transition:'all .15s' }}>
            {t==='create' ? '방 만들기' : '참여하기'}
          </button>
        ))}
      </div>

      {tab==='create' && (
        <div>
          <label style={{ fontSize:13, color:'var(--color-text-secondary)' }}>닉네임</label>
          <input value={hostName} onChange={e=>setHostName(e.target.value)} maxLength={8} placeholder="최대 8자" style={{ ...inp, marginBottom:16 }} onKeyDown={e=>e.key==='Enter'&&handleCreate()} />
          <label style={{ fontSize:13, color:'var(--color-text-secondary)' }}>총 점심 금액</label>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:6, marginBottom:20 }}>
            <input value={amount} onChange={e=>setAmount(e.target.value)} type="number" style={{ flex:1, padding:'10px 12px', fontSize:16, borderRadius:8, border:'1.5px solid var(--color-border-secondary)', background:'var(--color-background-primary)', color:'var(--color-text-primary)' }} />
            <span style={{ fontSize:15, color:'var(--color-text-secondary)' }}>원</span>
          </div>
          {error && <p style={{ color:'#E24B4A', fontSize:13, marginBottom:12 }}>{error}</p>}
          <button onClick={handleCreate} disabled={loading} style={{ width:'100%', padding:14, borderRadius:10, border:'none', cursor: loading?'not-allowed':'pointer', background:'#534AB7', color:'#fff', fontSize:16, fontWeight:500, opacity: loading?.6:1 }}>
            {loading ? '생성 중...' : '방 만들기'}
          </button>
        </div>
      )}

      {tab==='join' && (
        <div>
          <label style={{ fontSize:13, color:'var(--color-text-secondary)' }}>방 코드</label>
          <input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} maxLength={6} placeholder="ABC123" style={{ ...inp, fontSize:20, textAlign:'center', letterSpacing:4, marginBottom:16 }} />
          <label style={{ fontSize:13, color:'var(--color-text-secondary)' }}>닉네임</label>
          <input value={joinNick} onChange={e=>setJoinNick(e.target.value)} maxLength={8} placeholder="최대 8자" style={{ ...inp, marginBottom:20 }} onKeyDown={e=>e.key==='Enter'&&handleJoin()} />
          {error && <p style={{ color:'#E24B4A', fontSize:13, marginBottom:12 }}>{error}</p>}
          <button onClick={handleJoin} disabled={loading} style={{ width:'100%', padding:14, borderRadius:10, border:'none', cursor: loading?'not-allowed':'pointer', background:'#534AB7', color:'#fff', fontSize:16, fontWeight:500, opacity: loading?.6:1 }}>
            {loading ? '입장 중...' : '참여하기'}
          </button>
        </div>
      )}
    </main>
  )
}
