'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { iconUrl } from '@/lib/utils'

const INDEX_URL = 'https://cdn.jsdelivr.net/gh/selfhst/icons@main/index.json'

interface IconEntry {
  Name: string
  Reference: string
  WebP: string
}

interface IconPickerProps {
  value: string | null
  onChange: (reference: string | null) => void
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false)
  const [icons, setIcons] = useState<IconEntry[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load icons when picker opens for the first time
  useEffect(() => {
    if (!open || icons.length > 0) return
    setLoading(true)
    fetch(INDEX_URL)
      .then(r => r.json())
      .then((data: IconEntry[]) => setIcons(Array.isArray(data) ? data : []))
      .catch(() => setIcons([]))
      .finally(() => setLoading(false))
  }, [open, icons.length])

  // Position the dropdown near the trigger button
  useEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const dropdownHeight = 340

    if (spaceBelow >= dropdownHeight) {
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: 320,
        zIndex: 9999,
      })
    } else {
      setDropdownStyle({
        position: 'fixed',
        bottom: window.innerHeight - rect.top + 4,
        left: rect.left,
        width: 320,
        zIndex: 9999,
      })
    }
  }, [open])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      const target = e.target as Node
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const filtered = query.trim()
    ? icons.filter(i =>
        i.Name.toLowerCase().includes(query.toLowerCase()) ||
        i.Reference.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 40)
    : icons.slice(0, 40)

  const dropdown = open ? (
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className="rounded-xl border border-border bg-popover shadow-xl"
    >
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            autoFocus
            placeholder="Search icons…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto p-2">
        {loading && (
          <p className="text-xs text-muted-foreground text-center py-4">Loading icons…</p>
        )}
        {!loading && filtered.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No icons found</p>
        )}
        {!loading && (
          <div className="grid grid-cols-5 gap-1">
            {filtered.map(icon => (
              <button
                key={icon.Reference}
                type="button"
                title={icon.Name}
                onClick={() => { onChange(icon.Reference); setOpen(false); setQuery('') }}
                className={`flex flex-col items-center gap-1 p-1.5 rounded-lg hover:bg-muted transition-colors ${value === icon.Reference ? 'bg-muted ring-1 ring-primary' : ''}`}
              >
                <img
                  src={iconUrl(icon.Reference)}
                  alt={icon.Name}
                  className="w-8 h-8 object-contain"
                  loading="lazy"
                  onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3' }}
                />
                <span className="text-[9px] text-muted-foreground truncate w-full text-center leading-tight">
                  {icon.Name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {!loading && query.trim() === '' && icons.length > 40 && (
        <p className="text-[10px] text-muted-foreground text-center pb-2">
          Search to find more — {icons.length.toLocaleString()} icons available
        </p>
      )}
    </div>
  ) : null

  return (
    <div className="flex items-center gap-2">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-background text-sm hover:bg-muted transition-colors min-w-0"
      >
        {value ? (
          <>
            <img
              src={iconUrl(value)}
              alt={value}
              className="w-5 h-5 rounded object-contain"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            <span className="truncate text-muted-foreground">{value}</span>
          </>
        ) : (
          <span className="text-muted-foreground">Choose icon…</span>
        )}
      </button>
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => onChange(null)}
        >
          <X className="w-4 h-4" />
        </Button>
      )}
      {typeof document !== 'undefined' && dropdown && createPortal(dropdown, document.body)}
    </div>
  )
}
