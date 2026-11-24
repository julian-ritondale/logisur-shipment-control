import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { label: 'Inicio', href: '#', active: true },
  { label: 'Cargas', href: '#', active: false },
  { label: 'Remitos', href: '#', active: false },
  { label: 'Reportes', href: '#', active: false },
]

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-40 bg-brand-indigo text-white shadow-sm">
        <div className="flex h-16 items-center gap-8 px-4 sm:px-6">
          <a href="#" className="text-lg font-semibold tracking-tight">
            LogiSur
          </a>
          <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                aria-current={item.active ? 'page' : undefined}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  item.active
                    ? 'bg-white/10 text-white'
                    : 'text-white/70 hover:bg-white/5 hover:text-white',
                )}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t bg-brand-mist">
        <div className="flex flex-col gap-1 px-4 py-6 text-xs text-muted-foreground sm:px-6">
          <span>© LogiSur</span>
        </div>
      </footer>
    </div>
  )
}
