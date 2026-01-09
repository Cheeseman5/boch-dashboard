import { cn } from '@/lib/utils';
import type { StoplightStatus } from '@/types/api';
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
}

export function Stoplight({ status, size = 'md', className, animate = false, tooltip }: StoplightProps) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-8 h-8',
  };

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
          'animate-pulse-glow': animate && (status === 'red' || status === 'yellow'),
        },
        className
      )}
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
