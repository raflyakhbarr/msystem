import { Moon, Sun, Contrast } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/Theme-provider"

export function ModeToggle() {
  const { setTheme, theme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      title="Toggle theme"
    >
      <Contrast className={`h-10 w-10 transition-all ${
        theme === 'dark' ? 'scale-0 -rotate-180' : 'scale-100 rotate-0'
      }`} />
      <Contrast className={`absolute h-10 w-10 transition-all ${
        theme === 'dark' ? 'scale-100 rotate-0' : 'scale-0 rotate-90'
      }`} />
      
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}