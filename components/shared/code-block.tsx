'use client'

import { useState } from 'react'
import { Copy, Check, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CodeBlockProps {
  code: string
  language?: string
  filename?: string
  className?: string
}

export function CodeBlock({ code, language, filename, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownload() {
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename ?? `config.${language ?? 'txt'}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={cn('code-block', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-zinc-900/50">
        <span className="text-xs font-mono text-muted-foreground">
          {filename ?? language ?? 'code'}
        </span>
        <div className="flex items-center gap-1">
          {filename && (
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>
      {/* Content */}
      <pre className="overflow-x-auto p-4 text-sm font-mono text-zinc-300 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  )
}
