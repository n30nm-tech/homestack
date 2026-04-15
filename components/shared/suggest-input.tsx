'use client'

import { useState, useRef } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Input } from '@/components/ui/input'
import { Check } from 'lucide-react'

interface SuggestInputProps {
  model: string
  field: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SuggestInput({ model, field, value, onChange, placeholder, className }: SuggestInputProps) {
  const [open, setOpen]           = useState(false)
  const [options, setOptions]     = useState<string[]>([])
  const [fetched, setFetched]     = useState(false)
  const inputRef                  = useRef<HTMLInputElement>(null)

  async function fetchOptions() {
    if (fetched) return
    setFetched(true)
    try {
      const res = await fetch(`/api/suggestions?model=${model}&field=${field}`)
      if (res.ok) setOptions(await res.json())
    } catch {}
  }

  const filtered = value.trim()
    ? options.filter(o => o.toLowerCase().includes(value.toLowerCase()) && o !== value)
    : options

  function select(opt: string) {
    onChange(opt)
    setOpen(false)
    inputRef.current?.blur()
  }

  return (
    <Popover.Root open={open && filtered.length > 0} onOpenChange={setOpen}>
      <Popover.Anchor asChild>
        <Input
          ref={inputRef}
          value={value}
          placeholder={placeholder}
          className={className}
          onChange={e => { onChange(e.target.value); setOpen(true) }}
          onFocus={() => { fetchOptions(); setOpen(true) }}
          onKeyDown={e => { if (e.key === 'Escape') setOpen(false) }}
        />
      </Popover.Anchor>

      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={4}
          onOpenAutoFocus={e => e.preventDefault()}
          className="w-[var(--radix-popover-trigger-width)] max-h-48 overflow-y-auto rounded-xl border border-border bg-popover shadow-xl z-50 outline-none p-1"
        >
          {filtered.map(opt => (
            <button
              key={opt}
              type="button"
              onMouseDown={e => { e.preventDefault(); select(opt) }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left hover:bg-muted transition-colors"
            >
              {value === opt && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
              <span className="truncate">{opt}</span>
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
