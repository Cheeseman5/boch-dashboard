import { useCallback, useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  // Keep internal state and the DOM in sync with next-themes when it resolves.
  useEffect(() => {
    if (!resolvedTheme) return;
    const nextIsDark = resolvedTheme === 'dark';
    setIsDark(nextIsDark);
    document.documentElement.classList.toggle('dark', nextIsDark);
  }, [resolvedTheme]);

  const handleToggle = useCallback(() => {
    const nextIsDark = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', nextIsDark);
    setIsDark(nextIsDark);
    setTheme(nextIsDark ? 'dark' : 'light');
  }, [setTheme]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggle}
          className="shrink-0"
        >
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

