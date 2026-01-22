import { cn } from '@/lib/utils';
import type { StoplightStatus } from '@/types/api';
import { STOPLIGHT_ANIMATION_SETTINGS } from '@/config/app.config';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface StoplightProps {
  status: StoplightStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animate?: boolean;
  tooltip?: string;
  /** Context for strobe scope filtering: 'watch' or 'global' */
  context?: 'watch' | 'global';
}

export function Stoplight({ 
  status, 
  size = 'md', 
  className, 
  animate = false, 
  tooltip,
  context = 'watch',
}: StoplightProps) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-8 h-8',
  };

  // Determine if this stoplight should animate based on config
  const { strobeScope, strobeSpeedSeconds, strobeStates } = STOPLIGHT_ANIMATION_SETTINGS;
  const shouldAnimate = animate && strobeStates[status] && (() => {
    if (strobeScope === 'none') return false;
    if (strobeScope === 'all') return true;
    if (strobeScope === 'watches' && context === 'watch') return true;
    if (strobeScope === 'summary' && context === 'global') return true;
    return false;
  })();

  const indicator = (
    <div
      className={cn(
        'rounded-full transition-all duration-300',
        sizeClasses[size],
        {
          'stoplight-green': status === 'green',
          'stoplight-yellow': status === 'yellow',
          'stoplight-red': status === 'red',
          'stoplight-grey': status === 'grey',
          'animate-pulse-glow': shouldAnimate,
        },
        className
      )}
      style={shouldAnimate ? { animationDuration: `${strobeSpeedSeconds}s` } : undefined}
      aria-label={`Status: ${status}`}
    />
  );

  if (!tooltip) {
    return indicator;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {indicator}
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
