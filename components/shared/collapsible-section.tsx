'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CollapsibleSectionProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
  className?: string
}

export function CollapsibleSection({ title, defaultOpen = true, children, className }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={cn('space-y-2', className)}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 group w-full text-left"
      >
        {open
          ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
          : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
        }
        <h2 className="text-sm font-semibold group-hover:text-primary transition-colors">{title}</h2>
      </button>
      {open && children}
    </div>
  )
}
