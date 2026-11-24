import { Search } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CARRIER } from '@/lib/carrier'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { label: 'Control', to: '/', end: true },
  { label: 'Envíos', to: '/shipments' },
  { label: 'Corridas', to: '/runs' },
  { label: 'Exportaciones', to: '/exports' },
]

export function AppShell() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-40 overflow-hidden bg-brand-indigo text-white shadow-sm">
        <div className="relative flex h-16 items-center gap-4 px-4 sm:px-6">
          <NavLink to="/" className="text-lg font-semibold tracking-tight">
            LogiSur
          </NavLink>
          <CarrierSelect />
          <nav aria-label="Principal" className="ml-2 flex items-center gap-1 overflow-x-auto">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-white/70 hover:bg-white/5 hover:text-white',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <HeaderSearch />
          <Mountains />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>

      <footer className="border-t bg-brand-mist">
        <div className="px-4 py-6 text-xs text-muted-foreground sm:px-6">© LogiSur</div>
      </footer>
    </div>
  )
}

/** Which carrier the screens show. Only one today (see `lib/carrier.ts`). */
function CarrierSelect() {
  return (
    <Select value={CARRIER.id}>
      <SelectTrigger
        size="sm"
        aria-label="Transportista"
        className="gap-1.5 rounded-full border-transparent bg-white/10 pr-2 pl-3 text-xs font-medium text-white transition-colors hover:bg-white/20 focus-visible:border-transparent focus-visible:ring-white/40 [&_svg]:text-white/70"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="start" sideOffset={6} className="min-w-44">
        <SelectGroup>
          <SelectLabel>Transportista</SelectLabel>
          <SelectItem value={CARRIER.id}>{CARRIER.name}</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

/**
 * Look a remito up from any page: a number usually arrives from outside (a call, an email).
 * "/" focuses it. Results open on `/search`.
 */
function HeaderSearch() {
  const navigate = useNavigate()
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      const typing = target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
      if (event.key === '/' && !typing) {
        event.preventDefault()
        input.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <form
      role="search"
      className="relative ml-auto hidden w-60 shrink-0 md:block lg:mr-56"
      onSubmit={(event) => {
        event.preventDefault()
        const field = input.current
        const number = field?.value.trim()
        if (!field || !number) return
        field.value = ''
        field.blur()
        void navigate(`/search?number=${encodeURIComponent(number)}`)
      }}
    >
      <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-white/60" />
      <Input
        ref={input}
        placeholder="Buscar remito…"
        aria-label="Buscar remito por número"
        autoComplete="off"
        className="h-8 rounded-full border-transparent bg-white/10 pr-8 pl-8 text-xs text-white placeholder:text-white/60 hover:bg-white/15 focus-visible:border-transparent focus-visible:bg-white/20 focus-visible:ring-white/40"
      />
      <kbd className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 rounded border border-white/25 px-1.5 font-sans text-[10px] text-white/60">
        /
      </kbd>
    </form>
  )
}

/** A Patagonian skyline in the brand palette, behind the right end of the header. */
function Mountains() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 220 64"
      className="pointer-events-none absolute right-0 bottom-0 hidden h-16 w-56 lg:block"
      preserveAspectRatio="xMaxYMax meet"
    >
      <circle cx="168" cy="20" r="7" fill="var(--brand-orange)" opacity="0.9" />
      {/* Far range */}
      <path
        d="M40 64 L78 30 L96 44 L122 18 L146 40 L162 30 L196 52 L220 38 L220 64 Z"
        fill="var(--brand-lavender)"
        opacity="0.45"
      />
      {/* Near range, Fitz Roy-like spires */}
      <path
        d="M70 64 L104 36 L116 44 L136 14 L144 26 L152 20 L172 46 L190 36 L220 58 L220 64 Z"
        fill="var(--brand-blue)"
        opacity="0.85"
      />
      {/* Snow caps */}
      <path d="M136 14 L129 25 L136 22 L141 27 L144 26 Z" fill="white" opacity="0.9" />
      <path d="M152 20 L147 28 L153 26 L157 30 Z" fill="white" opacity="0.9" />
      <path d="M104 36 L98 41 L104 40 L108 43 Z" fill="white" opacity="0.8" />
      {/* Foothills */}
      <path
        d="M0 64 L30 54 L60 58 L96 50 L130 58 L170 52 L220 60 L220 64 Z"
        fill="var(--brand-peach)"
        opacity="0.55"
      />
    </svg>
  )
}
