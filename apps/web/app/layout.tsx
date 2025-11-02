import type { Metadata } from 'next'
import { Header } from './_components/header'
import { Sidebar } from './_components/sidebar'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

export const metadata: Metadata = {
  title: 'Amazon Pipeline Dashboard',
  description: 'Product data pipeline dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <div className="flex min-h-screen flex-col">
          <Header />
          <div className="flex flex-1">
            <div className="hidden lg:block">
              <Sidebar />
            </div>
            <main className="flex-1 container mx-auto p-4 lg:p-6 max-w-[1440px]">
              {children}
            </main>
          </div>
        </div>
        <Toaster />
      </body>
    </html>
  )
}
