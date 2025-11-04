import { useState } from 'react';
import Map from './Map';
import Feed from './Feed';
import { ENV, FLAGS } from '../env';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function Bronze() {
  const [dateRange] = useState({ start: '2024-01-01', end: '2025-12-31' });
  const [selectedQg, setSelectedQg] = useState<string[]>(['research', 'needs_id', 'casual']);
  const [loginFilter, setLoginFilter] = useState('');
  const [showDev, setShowDev] = useState(false);
  const [overlayStats, setOverlayStats] = useState({ circles: 0, corridors: 0 });
  const [fetchMethod, setFetchMethod] = useState<'rpc' | 'direct' | null>(null);

  if (!FLAGS.TROPHIES_ENABLED) {
    return (
      <div className="p-4">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Bronze View</h2>
          <p className="text-muted-foreground">
            Trophy features are currently disabled. Set VITE_FEATURE_TROPHIES=true to enable.
          </p>
        </div>
      </div>
    );
  }

  if (!ENV.SUPABASE_URL || !ENV.SUPABASE_ANON_KEY) {
    return (
      <div className="p-4">
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg">
          <p className="font-semibold">Missing Supabase Configuration</p>
          <p className="text-sm mt-1">Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Lovable → Settings → Secrets</p>
        </div>
      </div>
    );
  }

  const qgOptions = [
    { value: 'research', label: 'Research', color: 'bg-green-500' },
    { value: 'needs_id', label: 'Needs ID', color: 'bg-yellow-500' },
    { value: 'casual', label: 'Casual', color: 'bg-gray-500' }
  ];

  const toggleQg = (qg: string) => {
    setSelectedQg(prev => 
      prev.includes(qg) ? prev.filter(q => q !== qg) : [...prev, qg]
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="p-3 bg-background border-b space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-sm">
            <span className="font-medium">Date:</span> {dateRange.start} to {dateRange.end}
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Quality:</span>
            {qgOptions.map(opt => (
              <Badge
                key={opt.value}
                variant={selectedQg.includes(opt.value) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleQg(opt.value)}
              >
                {opt.label}
              </Badge>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Filter by login (comma-separated)"
              value={loginFilter}
              onChange={(e) => setLoginFilter(e.target.value)}
              className="text-sm border rounded px-2 py-1 w-64"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDev(!showDev)}
          >
            Dev
          </Button>
        </div>

        {showDev && (
          <div className="text-xs bg-muted p-2 rounded">
            <div>Overlays: {overlayStats.circles} circles, {overlayStats.corridors} corridors</div>
            <div>Fetch method: {fetchMethod || 'none yet'}</div>
          </div>
        )}
      </div>

      {/* 2-pane layout */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <Map
            dateRange={dateRange}
            qualityGrades={selectedQg}
            logins={loginFilter.split(',').map(s => s.trim()).filter(Boolean)}
            onOverlayStats={setOverlayStats}
            onFetchMethod={setFetchMethod}
          />
        </div>
        <div className="w-80 border-l overflow-y-auto">
          <Feed
            dateRange={dateRange}
            qualityGrades={selectedQg}
            logins={loginFilter.split(',').map(s => s.trim()).filter(Boolean)}
          />
        </div>
      </div>
    </div>
  );
}
