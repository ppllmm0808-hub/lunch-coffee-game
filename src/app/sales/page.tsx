'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { salesSupabase } from '@/lib/sales-supabase'

export default function SalesIndexPage() {
  const router = useRouter()

  useEffect(() => {
    salesSupabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace('/sales/dashboard')
      } else {
        router.replace('/sales/login')
      }
    })
  }, [router])

  return (
    <div style={{ minHeight: '100vh', background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#fff' }}>로딩 중...</p>
    </div>
  )
}
