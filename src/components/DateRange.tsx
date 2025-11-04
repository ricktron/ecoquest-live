import { useState } from 'react';
import { useAppState } from '@/lib/state';
import { Button } from './ui/button';
import { Calendar } from 'lucide-react';
import dayjs from 'dayjs';

export default function DateRange() {
  const { startDate, endDate, setDateRange } = useAppState();
  const [localStart, setLocalStart] = useState(startDate);
  const [localEnd, setLocalEnd] = useState(endDate);

  const applyRange = () => {
    setDateRange(localStart, localEnd);
  };

  const quickRanges = [
    { label: 'Last 30 days', days: 30 },
    { label: 'Last 90 days', days: 90 },
    { label: 'This year', days: dayjs().diff(dayjs().startOf('year'), 'day') },
    { label: 'Last 5 years', days: 5 * 365 },
  ];

  const setQuickRange = (days: number) => {
    const end = dayjs().format('YYYY-MM-DD');
    const start = dayjs().subtract(days, 'day').format('YYYY-MM-DD');
    setLocalStart(start);
    setLocalEnd(end);
    setDateRange(start, end);
  };

  return (
    <div className="p-3 bg-muted/50 rounded-lg space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Calendar className="h-4 w-4" />
        <span>Date Range</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-muted-foreground">Start</label>
          <input
            type="date"
            value={localStart}
            onChange={(e) => setLocalStart(e.target.value)}
            className="w-full px-2 py-1 text-sm border rounded"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">End</label>
          <input
            type="date"
            value={localEnd}
            onChange={(e) => setLocalEnd(e.target.value)}
            className="w-full px-2 py-1 text-sm border rounded"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {quickRanges.map(range => (
          <Button
            key={range.label}
            variant="outline"
            size="sm"
            onClick={() => setQuickRange(range.days)}
          >
            {range.label}
          </Button>
        ))}
      </div>

      <Button onClick={applyRange} size="sm" className="w-full">
        Apply
      </Button>
    </div>
  );
}
