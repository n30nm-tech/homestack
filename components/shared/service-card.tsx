'use client'

import Link from 'next/link'
import { ExternalLink, Star } from 'lucide-react'
import { StatusBadge } from './status-badge'
import { Status } from '@prisma/client'

interface ServiceCardProps {
  service: {
    id: string
    name: string
    url: string | null
    status: Status
    category: string | null
    favourite: boolean
  }
}

export function ServiceCard({ service }: ServiceCardProps) {
  return (
    <div
      className="relative group flex items-center gap-3 px-3.5 py-3 rounded-[var(--radius)] transition-all duration-150"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.background = 'rgba(255,255,255,0.04)'
        el.style.borderColor = 'rgba(255,255,255,0.1)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.background = 'rgba(255,255,255,0.025)'
        el.style.borderColor = 'rgba(255,255,255,0.06)'
      }}
    >
      {/* Stretch link over card */}
      <Link
        href={`/services/${service.id}`}
        className="absolute inset-0 rounded-[var(--radius)]"
        aria-label={service.name}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
            {service.name}
          </p>
          {service.favourite && (
            <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={service.status} />
          {service.category && (
            <span className="text-[11px] text-muted-foreground/50 truncate">{service.category}</span>
          )}
        </div>
      </div>

      {service.url && (
        <a
          href={service.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="relative z-10 shrink-0 p-1.5 rounded-lg text-muted-foreground/40
                     hover:text-foreground transition-colors"
          style={{ background: 'transparent' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  )
}
