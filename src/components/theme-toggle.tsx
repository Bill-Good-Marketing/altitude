"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "../components/theme-provider"
import { useEffect, useState } from "react"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button className="rounded-md glass-button w-9 h-9">
        <span className="sr-only">Toggle theme</span>
        <div className="h-5 w-5 bg-slate-300 dark:bg-slate-700 rounded-md" />
      </button>
    )
  }

  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="rounded-md glass-button w-9 h-9 relative overflow-hidden transition-colors"
    >
      <span className="sr-only">Toggle theme</span>
      <div className="absolute inset-0 flex items-center justify-center transition-transform duration-500 ease-in-out">
        <Sun
          className={`h-5 w-5 text-yellow-500 ${
            theme === "dark" ? "rotate-90 opacity-0 scale-0" : "rotate-0 opacity-100 scale-100"
          } transition-all duration-500`}
        />
        <Moon
          className={`h-5 w-5 text-slate-300 absolute ${
            theme === "light" ? "-rotate-90 opacity-0 scale-0" : "rotate-0 opacity-100 scale-100"
          } transition-all duration-500`}
        />
      </div>
    </button>
  )
}
