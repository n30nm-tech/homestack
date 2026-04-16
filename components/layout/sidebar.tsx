'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  Boxes,
  Server,
  Cpu,
  Network,
  HardDrive,
  FileText,
  Activity,
  LogOut,
  ALargeSmall,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFontSize } from '@/components/providers/font-size-provider'

const navItems = [
  { href: '/dashboard',      label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/services',       label: 'Services',       icon: Boxes           },
  { href: '/devices',        label: 'Devices',        icon: Server          },
  { href: '/virtualisation', label: 'Virtualisation', icon: Cpu             },
  { href: '/network',        label: 'Network',        icon: Network         },
  { href: '/backups',        label: 'Backups',        icon: HardDrive       },
  { href: '/uptime',         label: 'Uptime',         icon: Activity        },
  { href: '/docs',           label: 'Docs',           icon: FileText        },
]

export function Sidebar() {
  const pathname = usePathname()
  const { fontSize, toggle } = useFontSize()

  return (
    <aside
      className="flex flex-col w-[220px] min-h-screen shrink-0 border-r border-border"
      style={{ background: 'hsl(222 24% 5%)' }}
    >
      {/* ── Logo ── */}
      <div className="h-[60px] flex items-center gap-3 px-5 border-b border-border shrink-0">
        <div className="relative flex items-center justify-center w-7 h-7 rounded-lg shrink-0"
             style={{ background: 'hsl(217 91% 60% / 0.12)', border: '1px solid hsl(217 91% 60% / 0.25)' }}>
          <Server className="w-3.5 h-3.5 text-primary" />
          {/* glow */}
          <div className="absolute inset-0 rounded-lg blur-md opacity-50"
               style={{ background: 'hsl(217 91% 60% / 0.3)' }} />
        </div>
        <div className="min-w-0 leading-none">
          <p className="text-[13px] font-semibold tracking-tight text-foreground truncate">HomeStack</p>
          <p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground/80 mt-0.5">homelab</p>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-2.5 py-5 overflow-y-auto">
        <p className="section-heading px-2.5 mb-3">Menu</p>
        <div className="space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'relative flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 group',
                  active
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                style={active
                  ? { background: 'hsl(217 91% 60% / 0.1)' }
                  : undefined
                }
                onMouseEnter={e => {
                  if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
                }}
                onMouseLeave={e => {
                  if (!active) (e.currentTarget as HTMLElement).style.background = ''
                }}
              >
                {/* Active left-border indicator */}
                {active && (
                  <span
                    className="absolute left-0 top-[18%] bottom-[18%] w-[2px] rounded-r-full"
                    style={{ background: 'hsl(217 91% 60%)' }}
                  />
                )}
                <Icon
                  className={cn(
                    'w-4 h-4 shrink-0 transition-colors',
                    active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                  )}
                />
                <span className="truncate">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* ── Bottom ── */}
      <div className="px-2.5 py-4 border-t border-border shrink-0 space-y-0.5">
        <button
          onClick={toggle}
          className="relative flex items-center gap-3 w-full px-2.5 py-2 rounded-lg text-sm font-medium
                     text-muted-foreground transition-all duration-150 hover:text-foreground"
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}
          title={fontSize === 'large' ? 'Switch to normal text' : 'Switch to large text'}
        >
          <ALargeSmall className="w-4 h-4 shrink-0" />
          <span>{fontSize === 'large' ? 'Normal text' : 'Large text'}</span>
        </button>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="relative flex items-center gap-3 w-full px-2.5 py-2 rounded-lg text-sm font-medium
                     text-muted-foreground transition-all duration-150 hover:text-foreground"
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  )
}
