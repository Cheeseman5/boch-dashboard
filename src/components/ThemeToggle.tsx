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

  useEffect(() => {
    if (!mounted) return;
    // Debug: confirm next-themes state and DOM class are updating.
    // eslint-disable-next-line no-console
    console.debug('[ThemeToggle] theme changed', {
      theme,
      resolvedTheme,
      currentTheme,
      htmlClass: typeof document !== 'undefined' ? document.documentElement.className : undefined,
    });
  }, [mounted, theme, resolvedTheme, currentTheme]);

  const handleToggle = useCallback(() => {
    const nextTheme = isDark ? 'light' : 'dark';

    // eslint-disable-next-line no-console
    console.debug('[ThemeToggle] click', {
      isDark,
      nextTheme,
      theme,
      resolvedTheme,
      currentTheme,
      htmlClassBefore: typeof document !== 'undefined' ? document.documentElement.className : undefined,
    });

    // Primary: tell next-themes to switch.
    setTheme(nextTheme);

    // Fallback: hard-sync the DOM class so Tailwind + CSS vars switch even if next-themes
    // isn't applying the attribute for some reason.
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', nextTheme === 'dark');
      document.documentElement.classList.toggle('light', nextTheme === 'light');

      // eslint-disable-next-line no-console
      console.debug('[ThemeToggle] after DOM class sync', {
        htmlClassAfter: document.documentElement.className,
      });

      // Check if CSS variables actually changed
      setTimeout(() => {
        const computedBg = getComputedStyle(document.documentElement).getPropertyValue('--background');
        const bodyBgColor = getComputedStyle(document.body).backgroundColor;
        // eslint-disable-next-line no-console
        console.debug('[ThemeToggle] CSS check', {
          '--background': computedBg,
          'body backgroundColor': bodyBgColor,
          'expected for light': '210 40% 98%',
          'expected for dark': '222 47% 6%',
        });
      }, 100);
    }
  }, [isDark, setTheme, theme, resolvedTheme, currentTheme]);

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


