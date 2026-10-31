import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '영업활동일지',
  description: '영업팀 일일 활동 기록 시스템',
}

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
