import { cn } from '@/lib/utils'
import { ReactNode } from 'react'
import { CopyButton } from './copy-button'

interface DetailFieldProps {
  label: string
  value?: string | number | ReactNode | null
  className?: string
  mono?: boolean
  copyValue?: string   // explicit string to copy when value is a ReactNode
}

export function DetailField({ label, value, className, mono, copyValue }: DetailFieldProps) {
  if (value === null || value === undefined || value === '') return null

  const copyText = copyValue ?? (typeof value === 'string' ? value : typeof value === 'number' ? String(value) : undefined)
  const showCopy = mono && copyText !== undefined

  return (
    <div className={cn('space-y-1', className)}>
      <p className="field-label">{label}</p>
      {typeof value === 'string' || typeof value === 'number' ? (
        <div className="flex items-center gap-1.5">
          <p className={cn('field-value', mono && 'font-mono text-xs')}>{value}</p>
          {showCopy && <CopyButton value={copyText!} />}
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <div className="field-value">{value}</div>
          {showCopy && <CopyButton value={copyText!} />}
        </div>
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
