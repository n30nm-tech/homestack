'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type FontScale = 'sm' | 'md' | 'lg' | 'xl'
export type FontFamily = 'system' | 'inter' | 'mono' | 'serif'

interface AppearanceState {
  fontScale: FontScale
  fontFamily: FontFamily
  setFontScale: (v: FontScale) => void
  setFontFamily: (v: FontFamily) => void
}

const Ctx = createContext<AppearanceState>({
  fontScale: 'md', fontFamily: 'system',
  setFontScale: () => {}, setFontFamily: () => {},
})

const SCALE_MAP: Record<FontScale, string> = {
  sm:  '93.75%',  // 15px
  md:  '100%',    // 16px (default)
  lg:  '112.5%',  // 18px
  xl:  '125%',    // 20px
}

const FAMILY_MAP: Record<FontFamily, string> = {
  system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  inter:  '"Inter", sans-serif',
  mono:   '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
  serif:  '"Georgia", "Times New Roman", serif',
}

function applyAppearance(scale: FontScale, family: FontFamily) {
  document.documentElement.style.fontSize = SCALE_MAP[scale]
  document.documentElement.style.fontFamily = FAMILY_MAP[family]
}

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [fontScale, setScaleState] = useState<FontScale>('md')
  const [fontFamily, setFamilyState] = useState<FontFamily>('system')

  useEffect(() => {
    const scale  = (localStorage.getItem('hs-font-scale')  as FontScale  | null) ?? 'md'
    const family = (localStorage.getItem('hs-font-family') as FontFamily | null) ?? 'system'
    setScaleState(scale)
    setFamilyState(family)
    applyAppearance(scale, family)
  }, [])

  function setFontScale(v: FontScale) {
    setScaleState(v)
    localStorage.setItem('hs-font-scale', v)
    applyAppearance(v, fontFamily)
  }

  function setFontFamily(v: FontFamily) {
    setFamilyState(v)
    localStorage.setItem('hs-font-family', v)
    applyAppearance(fontScale, v)
  }

  return (
    <Ctx.Provider value={{ fontScale, fontFamily, setFontScale, setFontFamily }}>
      {children}
    </Ctx.Provider>
  )
}

export function useAppearance() { return useContext(Ctx) }
