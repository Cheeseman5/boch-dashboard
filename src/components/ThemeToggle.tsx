import { useCallback, useEffect, useMemo, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function ThemeToggle() {
  const { resolvedTheme, theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const currentTheme = useMemo(() => {
    // resolvedTheme is the one that matters for "system".
    // Before mount it can be undefined; we avoid relying on it to prevent mismatches.
    if (!mounted) return 'dark';
    return resolvedTheme ?? theme ?? 'dark';
  }, [mounted, resolvedTheme, theme]);

  const isDark = currentTheme === 'dark';

  const handleToggle = useCallback(() => {
    const nextTheme = isDark ? 'light' : 'dark';
    setTheme(nextTheme);

    // Fallback: hard-sync the DOM class so Tailwind + CSS vars switch
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', nextTheme === 'dark');
      document.documentElement.classList.toggle('light', nextTheme === 'light');
    }
  }, [isDark, setTheme]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="ghost" size="icon" onClick={handleToggle} className="shrink-0">
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">{isDark ? 'Switch to light mode' : 'Switch to dark mode'}</p>
      </TooltipContent>
    </Tooltip>
  );
}


