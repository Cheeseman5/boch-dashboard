import { Stoplight } from './Stoplight';
import type { StoplightStatus } from '@/types/api';
import { calculateGlobalStatus, getStatusCounts } from '@/lib/stoplight';

interface GlobalHealthProps {
  statuses: StoplightStatus[];
  isLoading?: boolean;
}

export function GlobalHealth({ statuses, isLoading }: GlobalHealthProps) {
  const globalStatus = calculateGlobalStatus(statuses);
  const counts = getStatusCounts(statuses);

  const statusLabels: Record<StoplightStatus, string> = {
    green: 'Healthy',
    yellow: 'Degraded',
    red: 'Failing',
    grey: 'No Data',
  };

  const nonZeroCounts = Object.entries(counts).filter(([, count]) => count > 0);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4">
        <Stoplight 
          status={globalStatus} 
          size="lg" 
          animate={false}
        />
        <div>
          <h2 className="text-2xl font-semibold">
            {isLoading ? 'Loading...' : statusLabels[globalStatus]}
          </h2>
          <p className="text-sm text-muted-foreground">
            System Health Status
          </p>
        </div>
      </div>

      {nonZeroCounts.length > 0 && (
        <div className="flex items-center gap-4 flex-wrap justify-center">
          {nonZeroCounts.map(([status, count]) => (
            <div key={status} className="flex items-center gap-2">
              <Stoplight status={status as StoplightStatus} size="sm" />
              <span className="text-sm text-muted-foreground">
                {count} {statusLabels[status as StoplightStatus]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
