'use client'

import { useState, useRef, useEffect } from 'react'
import { Settings, X } from 'lucide-react'
import { useAppearance, FontScale, FontFamily } from '@/components/providers/appearance-provider'
import { cn } from '@/lib/utils'

const SCALES: { value: FontScale; label: string }[] = [
  { value: 'sm', label: 'S'  },
  { value: 'md', label: 'M'  },
  { value: 'lg', label: 'L'  },
  { value: 'xl', label: 'XL' },
]

const FONTS: { value: FontFamily; label: string; preview: string }[] = [
  { value: 'system', label: 'System',   preview: 'Ag' },
  { value: 'inter',  label: 'Inter',    preview: 'Ag' },
  { value: 'mono',   label: 'Monospace',preview: 'Ag' },
  { value: 'serif',  label: 'Serif',    preview: 'Ag' },
]

const FONT_STYLES: Record<FontFamily, React.CSSProperties> = {
  system: { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  inter:  { fontFamily: '"Inter", sans-serif' },
  mono:   { fontFamily: '"JetBrains Mono", "Fira Code", monospace' },
  serif:  { fontFamily: '"Georgia", serif' },
}

export function AppearancePanel() {
  const { fontScale, fontFamily, setFontScale, setFontFamily } = useAppearance()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'relative flex items-center gap-3 w-full px-2.5 py-2 rounded-lg text-sm font-medium',
          'text-muted-foreground transition-all duration-150 hover:text-foreground',
          open && 'text-foreground'
        )}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLElement).style.background = '' }}
        title="Appearance settings"
      >
        <Settings className="w-4 h-4 shrink-0" />
        <span>Appearance</span>
      </button>

      {open && (
        <div
          className="absolute bottom-full left-0 mb-2 w-64 rounded-xl border border-border shadow-xl z-50"
          style={{ background: 'hsl(222 24% 7%)' }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold">Appearance</p>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-5">
            {/* Font size */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Text size</p>
              <div className="grid grid-cols-4 gap-1.5">
                {SCALES.map(s => (
                  <button
                    key={s.value}
                    onClick={() => setFontScale(s.value)}
                    className={cn(
                      'py-2 rounded-lg text-sm font-medium border transition-colors',
                      fontScale === s.value
                        ? 'border-primary bg-primary/15 text-primary'
                        : 'border-border text-muted-foreground hover:text-foreground hover:border-border/80'
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {fontScale === 'sm' ? 'Small (15px)' : fontScale === 'md' ? 'Default (16px)' : fontScale === 'lg' ? 'Large (18px)' : 'Extra large (20px)'}
              </p>
            </div>

            {/* Font family */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Font</p>
              <div className="grid grid-cols-2 gap-1.5">
                {FONTS.map(f => (
                  <button
                    key={f.value}
                    onClick={() => setFontFamily(f.value)}
                    className={cn(
                      'flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg border transition-colors',
                      fontFamily === f.value
                        ? 'border-primary bg-primary/15'
                        : 'border-border hover:border-border/80 hover:bg-white/[0.03]'
                    )}
                  >
                    <span
                      className="text-lg leading-none"
                      style={FONT_STYLES[f.value]}
                    >
                      {f.preview}
                    </span>
                    <span className={cn(
                      'text-[11px] font-medium',
                      fontFamily === f.value ? 'text-primary' : 'text-muted-foreground'
                    )}>
                      {f.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
