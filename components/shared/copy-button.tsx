'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface CopyButtonProps {
  value: string
  className?: string
}

export function CopyButton({ value, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`inline-flex items-center justify-center w-5 h-5 rounded text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0 ${className ?? ''}`}
      title={copied ? 'Copied!' : 'Copy'}
    >
      {copied
        ? <Check className="w-3 h-3 text-green-400" />
        : <Copy className="w-3 h-3" />
      }
    </button>
  )
}
