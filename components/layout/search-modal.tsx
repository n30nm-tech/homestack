'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Server, Boxes, Cpu, Network, HardDrive, FileText, X, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { StatusBadge } from '../shared/status-badge'
import { Status } from '@prisma/client'

interface SearchResult {
  id: string
  type: 'service' | 'device' | 'vm' | 'virtualHost' | 'vlan' | 'dns' | 'proxy' | 'backup' | 'doc'
  name: string
  subtitle?: string
  status?: Status
  href: string
}

const TYPE_ICONS: Record<SearchResult['type'], React.ElementType> = {
  service: Boxes,
  device: Server,
  vm: Cpu,
  virtualHost: Cpu,
  vlan: Network,
  dns: Network,
  proxy: Network,
  backup: HardDrive,
  doc: FileText,
}

const TYPE_LABELS: Record<SearchResult['type'], string> = {
  service: 'Service',
  device: 'Device',
  vm: 'VM',
  virtualHost: 'Host',
  vlan: 'VLAN',
  dns: 'DNS',
  proxy: 'Reverse Proxy',
  backup: 'Backup Job',
  doc: 'Documentation',
}

interface SearchModalProps {
  open: boolean
  onClose: () => void
}

export function SearchModal({ open, onClose }: SearchModalProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(0)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (open) onClose()
        else document.dispatchEvent(new CustomEvent('homestack:search'))
      }
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.results ?? [])
      setSelected(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => search(query), 200)
    return () => clearTimeout(t)
  }, [query, search])

  function navigate(result: SearchResult) {
    router.push(result.href)
    onClose()
    setQuery('')
    setResults([])
  }

  useEffect(() => {
    if (!open) { setQuery(''); setResults([]) }
  }, [open])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
    if (e.key === 'Enter' && results[selected]) navigate(results[selected])
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search services, devices, VMs…"
            className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
          />
          {loading && <div className="w-4 h-4 border-2 border-border border-t-primary rounded-full animate-spin" />}
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <ul className="max-h-80 overflow-y-auto p-2">
            {results.map((result, i) => {
              const Icon = TYPE_ICONS[result.type]
              return (
                <li key={`${result.type}-${result.id}`}>
                  <button
                    onClick={() => navigate(result)}
                    onMouseEnter={() => setSelected(i)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                      selected === i ? 'bg-accent' : 'hover:bg-accent/50',
                    )}
                  >
                    <div className="p-1.5 rounded-md bg-muted shrink-0">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{result.name}</p>
                      {result.subtitle && (
                        <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {result.status && <StatusBadge status={result.status} />}
                      <span className="text-xs text-muted-foreground">{TYPE_LABELS[result.type]}</span>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {query && !loading && results.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No results for &ldquo;{query}&rdquo;
          </div>
        )}

        {!query && (
          <div className="px-4 py-5 text-center text-sm text-muted-foreground">
            Start typing to search across all records
          </div>
        )}

        <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
          <span><kbd className="bg-muted px-1.5 py-0.5 rounded">↑↓</kbd> navigate</span>
          <span><kbd className="bg-muted px-1.5 py-0.5 rounded">↵</kbd> open</span>
          <span><kbd className="bg-muted px-1.5 py-0.5 rounded">esc</kbd> close</span>
        </div>
      </div>
    </div>
  )
}
