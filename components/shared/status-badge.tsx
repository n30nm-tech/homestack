import { Status, BackupStatus } from '@prisma/client'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: Status
  className?: string
}

const STATUS_STYLES: Record<Status, { dot: string; text: string; bg: string }> = {
  ACTIVE:            { dot: '#34d399', text: '#6ee7b7', bg: 'rgba(52,211,153,0.08)'  },
  WARNING:           { dot: '#fbbf24', text: '#fde68a', bg: 'rgba(251,191,36,0.08)'  },
  OFFLINE:           { dot: '#71717a', text: '#a1a1aa', bg: 'rgba(113,113,122,0.08)' },
  BUILD_IN_PROGRESS: { dot: '#60a5fa', text: '#93c5fd', bg: 'rgba(96,165,250,0.08)'  },
  RETIRED:           { dot: '#3f3f46', text: '#71717a', bg: 'rgba(63,63,70,0.08)'    },
  UNKNOWN:           { dot: '#52525b', text: '#71717a', bg: 'rgba(82,82,91,0.08)'    },
}

const STATUS_LABELS: Record<Status, string> = {
  ACTIVE:            'Active',
  OFFLINE:           'Offline',
  WARNING:           'Warning',
  BUILD_IN_PROGRESS: 'Building',
  RETIRED:           'Retired',
  UNKNOWN:           'Unknown',
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const s = STATUS_STYLES[status]
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium shrink-0', className)}
      style={{ background: s.bg, color: s.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.dot }} />
      {STATUS_LABELS[status]}
    </span>
  )
}

/* ── Backup status ── */

const BACKUP_STYLES: Record<BackupStatus, { text: string; bg: string; label: string }> = {
  SUCCESS: { text: '#6ee7b7', bg: 'rgba(52,211,153,0.08)',  label: 'Success' },
  FAILED:  { text: '#fca5a5', bg: 'rgba(239,68,68,0.08)',   label: 'Failed'  },
  RUNNING: { text: '#93c5fd', bg: 'rgba(96,165,250,0.08)',  label: 'Running' },
  UNKNOWN: { text: '#a1a1aa', bg: 'rgba(113,113,122,0.08)', label: 'Unknown' },
}

interface BackupStatusBadgeProps {
  status: BackupStatus
  className?: string
}

export function BackupStatusBadge({ status, className }: BackupStatusBadgeProps) {
  const s = BACKUP_STYLES[status]
  return (
    <span
      className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium shrink-0', className)}
      style={{ background: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  )
}
