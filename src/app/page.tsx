'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 12px', fontSize: 16, marginTop: 6,
  borderRadius: 8, border: '1.5px solid var(--color-border-secondary)',
  background: 'var(--color-background-primary)', color: 'var(--color-text-primary)',
  boxSizing: 'border-box',
}

const PACK_OPTIONS = [
  {
    id: 'lunch-sagi',
    emoji: '🍱',
    name: '점심 사기 게임',
    desc: '꼴찌가 점심 더 낸다. 3라운드 심리전.',
    available: true,
  },
  {
    id: 'gaegyeong-ju',
    emoji: '🐕',
    name: '개경주',
    desc: '경마의 재미를 모임에서',
    available: false,
  },
  {
    id: 'ladder',
    emoji: '🪜',
    name: '사다리 타기',
    desc: '운명의 사다리',
    available: false,
  },
]

export default function HomePage() {
  const router = useRouter()
  const [tab, setTab] = useState<'create' | 'join'>('create')

  // 방 만들기 — 단계
  const [step, setStep] = useState<'select' | 'config'>('select')
  const [selectedPackId, setSelectedPackId] = useState('lunch-sagi')

  // 방 만들기 — 입력값
  const [hostName, setHostName] = useState('')
  const [amount, setAmount] = useState('35000')
  const [rounds, setRounds] = useState(3)

  // 참여하기
  const [joinCode, setJoinCode] = useState('')
  const [joinNick, setJoinNick] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!hostName.trim()) { setError('닉네임을 입력하세요'); return }
    setLoading(true); setError('')
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gamePackId: selectedPackId,
        hostName: hostName.trim(),
        totalAmount: parseInt(amount) || 35000,
        maxRounds: rounds,
      }),
    })
    if (!res.ok) { setError('방 생성 실패'); setLoading(false); return }
    const { room, player } = await res.json()
    localStorage.setItem(`player-${room.code}`, JSON.stringify(player))
    router.push(`/room/${room.code}/wait`)
  }

  async function handleJoin() {
    if (!joinNick.trim() || !joinCode.trim()) { setError('코드와 닉네임을 입력하세요'); return }
    setLoading(true); setError('')
    const code = joinCode.trim().toUpperCase()
    const res = await fetch('/api/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode: code, nickname: joinNick.trim() }),
    })
    if (!res.ok) { const d = await res.json(); setError(d.error || '입장 실패'); setLoading(false); return }
    const { player } = await res.json()
    localStorage.setItem(`player-${code}`, JSON.stringify(player))
    router.push(`/room/${code}/wait`)
  }

  return (
    <main style={{ maxWidth: 400, margin: '0 auto', padding: '2rem 1rem', fontFamily: 'var(--font-sans)' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
        <div style={{ fontSize: 44, marginBottom: 8 }}>🍱</div>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>점심 내기 플랫폼</h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 6 }}>꼴찌가 점심 더 낸다</p>
<div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 12, background: '#F9F9FF', border: '1px solid #EEEDFE', textAlign: 'left', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
  <div>🏠 <strong>방장</strong>: 방 만들기 버튼으로 방 생성</div>
  <div>📱 <strong>같은 공간</strong>: QR코드 스캔으로 입장</div>
  <div>🔗 <strong>다른 공간</strong>: 방장이 보낸 링크로 입장</div>
</div>
 <button
  onClick={() => {
    if (navigator.share) {
      navigator.share({
        title: '점심 내기 플랫폼',
        text: '꼴찌가 점심 더 낸다! 같이 게임해요 🍱',
        url: 'https://lunch-coffee-game.vercel.app',
      })
    } else {
      navigator.clipboard.writeText('https://lunch-coffee-game.vercel.app')
      alert('링크가 복사됐습니다!')
    }
  }}
  style={{
    width: '100%', marginTop: 12, padding: '12px 0',
    borderRadius: 12, border: '1.5px solid #534AB7',
    background: '#EEEDFE', color: '#534AB7',
    fontSize: 15, fontWeight: 600, cursor: 'pointer',
  }}
>
  📲 친구에게 게임 링크 보내기
</button>    
      {/* 탭 */}
      <div style={{ display: 'flex', marginBottom: 20, border: '0.5px solid var(--color-border-tertiary)', borderRadius: 10, overflow: 'hidden' }}>
        {(['create', 'join'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setStep('select'); setError('') }}
            style={{ flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, background: tab === t ? '#534AB7' : 'transparent', color: tab === t ? '#fff' : 'var(--color-text-secondary)', transition: 'all .15s' }}>
            {t === 'create' ? '방 만들기' : '참여하기'}
          </button>
        ))}
      </div>

      {/* ─── 방 만들기 ─── */}
      {tab === 'create' && step === 'select' && (
        <div>
          <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>게임 선택</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 4 }}>
            {PACK_OPTIONS.map(pack => {
              const selected = selectedPackId === pack.id
              return (
                <button key={pack.id}
                  onClick={() => pack.available && setSelectedPackId(pack.id)}
                  disabled={!pack.available}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 16px', borderRadius: 12, textAlign: 'left', cursor: pack.available ? 'pointer' : 'not-allowed',
                    border: selected ? '2px solid #534AB7' : '1.5px solid var(--color-border-secondary)',
                    background: selected ? '#EEEDFE' : 'var(--color-background-primary)',
                    opacity: pack.available ? 1 : 0.45,
                  }}>
                  <span style={{ fontSize: 30 }}>{pack.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: selected ? '#534AB7' : 'var(--color-text-primary)' }}>
                      {pack.name}
                      {!pack.available && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--color-text-tertiary)', fontWeight: 400 }}>준비중</span>}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 2 }}>{pack.desc}</div>
                  </div>
                  {selected && <span style={{ fontSize: 18, color: '#534AB7' }}>✓</span>}
                </button>
              )
            })}
          </div>
          <button
            onClick={() => setStep('config')}
            style={{ width: '100%', marginTop: 16, padding: 14, borderRadius: 10, border: 'none', cursor: 'pointer', background: '#534AB7', color: '#fff', fontSize: 16, fontWeight: 500 }}>
            다음
          </button>
        </div>
      )}

      {tab === 'create' && step === 'config' && (
        <div>
          <button onClick={() => setStep('select')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--color-text-tertiary)', padding: '0 0 16px', display: 'flex', alignItems: 'center', gap: 4 }}>
            ← 게임 선택으로
          </button>

          {/* 선택된 게임 표시 */}
          {(() => {
            const pack = PACK_OPTIONS.find(p => p.id === selectedPackId)!
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: '#EEEDFE', marginBottom: 20 }}>
                <span style={{ fontSize: 22 }}>{pack.emoji}</span>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#534AB7' }}>{pack.name}</span>
              </div>
            )
          })()}

          <label style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>닉네임</label>
          <input value={hostName} onChange={e => setHostName(e.target.value)} maxLength={8} placeholder="최대 8자"
            style={{ ...inp, marginBottom: 16 }} onKeyDown={e => e.key === 'Enter' && handleCreate()} />

          <label style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>총 점심 금액</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 16 }}>
            <input value={amount} onChange={e => setAmount(e.target.value)} type="number"
              style={{ flex: 1, padding: '10px 12px', fontSize: 16, borderRadius: 8, border: '1.5px solid var(--color-border-secondary)', background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }} />
            <span style={{ fontSize: 15, color: 'var(--color-text-secondary)' }}>원</span>
          </div>

          <label style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>라운드 수</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 6, marginBottom: 20 }}>
            {[2, 3, 5].map(r => (
              <button key={r} onClick={() => setRounds(r)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: rounds === r ? '2px solid #534AB7' : '1.5px solid var(--color-border-secondary)', background: rounds === r ? '#EEEDFE' : 'transparent', color: rounds === r ? '#534AB7' : 'var(--color-text-secondary)', fontSize: 15, fontWeight: rounds === r ? 600 : 400, cursor: 'pointer' }}>
                {r}라운드
              </button>
            ))}
          </div>

          {error && <p style={{ color: '#E24B4A', fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <button onClick={handleCreate} disabled={loading}
            style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', background: '#534AB7', color: '#fff', fontSize: 16, fontWeight: 500, opacity: loading ? 0.6 : 1 }}>
            {loading ? '생성 중...' : '방 만들기'}
          </button>
        </div>
      )}

      {/* ─── 참여하기 ─── */}
      {tab === 'join' && (
        <div>
          <label style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>방 코드</label>
          <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} maxLength={6} placeholder="ABC123"
            style={{ ...inp, fontSize: 20, textAlign: 'center', letterSpacing: 4, marginBottom: 16 }} />
          <label style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>닉네임</label>
          <input value={joinNick} onChange={e => setJoinNick(e.target.value)} maxLength={8} placeholder="최대 8자"
            style={{ ...inp, marginBottom: 20 }} onKeyDown={e => e.key === 'Enter' && handleJoin()} />
          {error && <p style={{ color: '#E24B4A', fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <button onClick={handleJoin} disabled={loading}
            style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', background: '#534AB7', color: '#fff', fontSize: 16, fontWeight: 500, opacity: loading ? 0.6 : 1 }}>
            {loading ? '입장 중...' : '참여하기'}
          </button>
        </div>
      )}
    </main>
  )
}
