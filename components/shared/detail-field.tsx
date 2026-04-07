import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface DetailFieldProps {
  label: string
  value?: string | number | ReactNode | null
  className?: string
  mono?: boolean
}

export function DetailField({ label, value, className, mono }: DetailFieldProps) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className={cn('space-y-1', className)}>
      <p className="field-label">{label}</p>
      {typeof value === 'string' || typeof value === 'number' ? (
        <p className={cn('field-value', mono && 'font-mono text-xs')}>{value}</p>
      ) : (
        <div className="field-value">{value}</div>
      )}
    </div>
  )
}

interface DetailGridProps {
  children: ReactNode
  className?: string
  cols?: 2 | 3 | 4
}

export function DetailGrid({ children, className, cols = 3 }: DetailGridProps) {
  return (
    <div
      className={cn(
        'grid gap-x-8 gap-y-5',
        cols === 2 && 'grid-cols-2',
        cols === 3 && 'grid-cols-2 md:grid-cols-3',
        cols === 4 && 'grid-cols-2 md:grid-cols-4',
        className,
      )}
    >
      {children}
    </div>
  )
}
