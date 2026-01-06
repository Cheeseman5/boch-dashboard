import { cn } from '@/lib/utils';
import type { StoplightStatus } from '@/types/api';

interface StoplightProps {
  status: StoplightStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animate?: boolean;
}

export function Stoplight({ status, size = 'md', className, animate = false }: StoplightProps) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-8 h-8',
  };

  return (
    <div
      className={cn(
        'rounded-full transition-all duration-300',
        sizeClasses[size],
        {
          'stoplight-green': status === 'green',
          'stoplight-yellow': status === 'yellow',
          'stoplight-red': status === 'red',
          'stoplight-grey': status === 'grey',
          'animate-pulse-glow': animate && status !== 'grey',
        },
        className
      )}
      aria-label={`Status: ${status}`}
    />
  );
}
