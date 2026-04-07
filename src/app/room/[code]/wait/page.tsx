'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { useRoom, useMyPlayer } from '@/lib/use-room'
import { supabase } from '@/lib/supabase'

export default function WaitPage({ params }: { params: { code: string } }) {
  const { code } = params
  const router = useRouter()
  const { room, players, loading } = useRoom(code)
  const { myPlayer } = useMyPlayer(code)
  const [starting, setStarting] = useState(false)

  // 게임 시작되면 자동으로 play 페이지로 이동
  useEffect(() => {
    if (room?.status === 'playing') {
      router.push(`/room/${code}/play`)
    }
  }, [room?.status, code, router])

  async function handleStart() {
    if (players.length < 2) { alert('2명 이상이어야 시작할 수 있어요'); return }
    setStarting(true)
    await supabase.from('rooms').update({ status: 'playing', current_round: 1 }).eq('code', code)
  }

  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/room/${code}/join`
    : ''

  function copyLink() {
    navigator.clipboard?.writeText(joinUrl)
    alert(`링크 복사됨!\n${joinUrl}`)
  }

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>불러오는 중...</div>

  return (
    <main style={{ maxWidth: 400, margin: '0 auto', padding: '1.5rem 1rem', fontFamily: 'var(--font-sans)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:500, margin:0 }}>대기실</h2>
          <p style={{ fontSize:13, color:'var(--color-text-tertiary)', margin:'4px 0 0' }}>친구들에게 코드를 알려주세요</p>
        </div>
        <div style={{ fontSize:22, fontWeight:600, letterSpacing:3, color:'#534AB7', background:'#EEEDFE', padding:'6px 14px', borderRadius:8 }}>
          {code}
        </div>
      </div>

      {/* QR 코드 */}
      {joinUrl && (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:20, padding:16, borderRadius:12, border:'0.5px solid var(--color-border-tertiary)', background:'#fff' }}>
          <QRCodeSVG value={joinUrl} size={150} level="M" />
          <p style={{ fontSize:12, color:'var(--color-text-tertiary)', margin:'10px 0 0', textAlign:'center' }}>카메라로 스캔하면 바로 입장</p>
        </div>
      )}

      {/* 링크 공유 */}
      <button onClick={copyLink} style={{ width:'100%', padding:11, borderRadius:8, border:'0.5px solid var(--color-border-secondary)', background:'transparent', cursor:'pointer', fontSize:13, color:'var(--color-text-secondary)', marginBottom:16 }}>
        링크 복사하기
      </button>

      {/* 참가자 목록 */}
      <p style={{ fontSize:13, fontWeight:500, marginBottom:8 }}>참가자 {players.length}명</p>
      <div style={{ marginBottom:20 }}>
        {players.map(p => (
          <div key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', borderRadius:8, border:'0.5px solid var(--color-border-tertiary)', marginBottom:6, background:'var(--color-background-primary)' }}>
            <span style={{ fontSize:15 }}>{p.nickname}</span>
            {p.isHost && (
              <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'#EEEDFE', color:'#3C3489', fontWeight:500 }}>방장</span>
            )}
          </div>
        ))}
      </div>

      {/* 시작 버튼 — 방장만 */}
      {myPlayer?.isHost && (
        <button
          onClick={handleStart}
          disabled={starting || players.length < 2}
          style={{ width:'100%', padding:14, borderRadius:10, border:'none', cursor: (starting||players.length<2) ? 'not-allowed':'pointer', background: players.length<2 ? 'var(--color-background-secondary)':'#534AB7', color: players.length<2 ? 'var(--color-text-tertiary)':'#fff', fontSize:16, fontWeight:500 }}
        >
          {starting ? '시작 중...' : players.length < 2 ? '2명 이상 필요' : `게임 시작 (${players.length}명)`}
        </button>
      )}
      {!myPlayer?.isHost && (
        <p style={{ textAlign:'center', fontSize:14, color:'var(--color-text-tertiary)' }}>방장이 시작하길 기다리는 중...</p>
      )}
    </main>
  )
}
