import { useState } from 'react';
import { useFilters } from '@/state/useFilters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';

const QG_OPTIONS = [
  { value: 'research', label: 'Research' },
  { value: 'needs_id', label: 'Needs ID' },
  { value: 'casual', label: 'Casual' }
];

export default function Filters() {
  const { dateRange, qg, logins, setDateRange, setQg, setLogins, reset } = useFilters();
  const [loginInput, setLoginInput] = useState(logins.join(', '));

  const toggleQg = (value: string) => {
    if (qg.includes(value)) {
      setQg(qg.filter(q => q !== value));
    } else {
      setQg([...qg, value]);
    }
  };

  const handleLoginChange = (value: string) => {
    setLoginInput(value);
    const parsed = value
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    setLogins(parsed);
  };

  const handleReset = () => {
    reset();
    setLoginInput('');
  };

  return (
    <div className="bg-white border-b p-4">
      <div className="flex flex-wrap gap-4 items-center">
        {/* Date Range Picker */}
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d, yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-3 space-y-3">
                <div>
                  <div className="text-xs font-medium mb-2">From</div>
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => date && setDateRange({ ...dateRange, from: date })}
                    disabled={(date) => date > dateRange.to}
                  />
                </div>
                <div>
                  <div className="text-xs font-medium mb-2">To</div>
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => date && setDateRange({ ...dateRange, to: date })}
                    disabled={(date) => date < dateRange.from || date > new Date()}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Quality Grade Chips */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">Quality:</span>
          {QG_OPTIONS.map(({ value, label }) => (
            <Badge
              key={value}
              variant={qg.includes(value) ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => toggleQg(value)}
            >
              {label}
              {qg.includes(value) && <X className="ml-1 h-3 w-3" />}
            </Badge>
          ))}
        </div>

        {/* Login Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">Users:</span>
          <Input
            type="text"
            placeholder="user1, user2"
            value={loginInput}
            onChange={(e) => handleLoginChange(e.target.value)}
            className="w-48 h-8 text-sm"
          />
        </div>

        {/* Reset Button */}
        <Button variant="ghost" size="sm" onClick={handleReset}>
          Reset
        </Button>
      </div>
    </div>
  );
}
