'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type FontSize = 'normal' | 'large'

const FontSizeContext = createContext<{
  fontSize: FontSize
  toggle: () => void
}>({ fontSize: 'normal', toggle: () => {} })

export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSize] = useState<FontSize>('normal')

  useEffect(() => {
    const stored = localStorage.getItem('hs-font-size') as FontSize | null
    if (stored === 'large') {
      setFontSize('large')
      document.documentElement.classList.add('large-text')
    }
  }, [])

  function toggle() {
    setFontSize(prev => {
      const next = prev === 'normal' ? 'large' : 'normal'
      localStorage.setItem('hs-font-size', next)
      document.documentElement.classList.toggle('large-text', next === 'large')
      return next
    })
  }

  return (
    <FontSizeContext.Provider value={{ fontSize, toggle }}>
      {children}
    </FontSizeContext.Provider>
  )
}

export function useFontSize() {
  return useContext(FontSizeContext)
}
