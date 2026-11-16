import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Theme } from './model'

const ThemeContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void }>({ theme: 'light', setTheme: () => {} })
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const value = localStorage.getItem('sleep-theme')
      return value === 'dark' || value === 'contrast' ? value : 'light'
    } catch { return 'light' }
  })
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#211719' : theme === 'contrast' ? '#ffffff' : '#fff8f0')
    try { localStorage.setItem('sleep-theme', theme) } catch { /* Theme still works in memory. */ }
  }, [theme])
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}
export const useTheme = () => useContext(ThemeContext)
