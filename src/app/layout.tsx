import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '점심 사기 게임',
  description: '꼴찌가 점심 더 낸다. 모임용 QR 게임 플랫폼.',
  // OG 이미지 — Phase 2에서 추가
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,   // 모바일 더블탭 줌 방지
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body style={{
        margin: 0,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        background: '#fafaf9',
        color: '#1a1a18',
        minHeight: '100vh',
        WebkitFontSmoothing: 'antialiased',
      }}>
        {children}
      </body>
    </html>
  )
}
