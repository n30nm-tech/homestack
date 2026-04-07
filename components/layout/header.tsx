'use client'

import { useState } from 'react'
import { Search, Plus } from 'lucide-react'
import { SearchModal } from './search-modal'
import { CreateWizard } from '../wizard/create-wizard'

interface HeaderProps {
  title: string
  description?: string
}

export function Header({ title, description }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)

  return (
    <>
      <header
        className="h-[60px] flex items-center px-6 gap-4 shrink-0 sticky top-0 z-10 border-b border-border"
        style={{ background: 'hsl(222 24% 5% / 0.85)', backdropFilter: 'blur(12px)' }}
      >
        {/* Title */}
        <div className="flex-1 min-w-0">
          <h1 className="text-[15px] font-semibold truncate text-foreground">{title}</h1>
          {description && (
            <p className="text-[11px] text-muted-foreground/70 truncate mt-px">{description}</p>
          )}
        </div>

        {/* Search trigger */}
        <button
          onClick={() => setSearchOpen(true)}
          className="hidden sm:flex items-center gap-2 h-8 px-3 rounded-lg text-sm
                     text-muted-foreground transition-all duration-150
                     hover:text-foreground hover:border-white/10"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            minWidth: '180px',
          }}
        >
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1 text-left text-[13px]">Search…</span>
          <kbd className="text-[10px] text-muted-foreground/50 font-mono bg-muted/60 px-1.5 py-0.5 rounded border border-border">
            ⌘K
          </kbd>
        </button>

        {/* Add New */}
        <button
          onClick={() => setWizardOpen(true)}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium
                     text-white transition-all duration-150
                     hover:opacity-90 active:scale-[0.97]"
          style={{ background: 'hsl(217 91% 60%)' }}
        >
          <Plus className="w-3.5 h-3.5" />
          Add New
        </button>
      </header>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <CreateWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </>
  )
}
