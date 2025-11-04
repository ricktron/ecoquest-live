import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bug } from 'lucide-react';
import { getOverlays } from '@/lib/api-bronze';

type ObsWithData = {
  quality_grade: string;
  inat_obs_id: number;
  user_login: string;
  latitude: number;
  longitude: number;
  taxon_name?: string;
  species_guess?: string;
  photo_url?: string;
  observedAt: string;
};

type DevToolsProps = {
  observations: ObsWithData[];
};

export default function DevTools({ observations }: DevToolsProps) {
  const [overlayCount, setOverlayCount] = useState({ locations: 0, corridors: 0 });

  useEffect(() => {
    getOverlays().then(data => {
      setOverlayCount({
        locations: data.locations.length,
        corridors: data.corridors.length
      });
    });
  }, []);

  const qgBreakdown = observations.reduce((acc, obs) => {
    acc[obs.quality_grade] = (acc[obs.quality_grade] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-4 right-4 z-[1000] rounded-full shadow-lg"
        >
          <Bug className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div className="font-semibold text-sm border-b pb-2">Dev Tools</div>
          
          <div>
            <div className="text-xs font-medium text-neutral-500 mb-1">Observations</div>
            <div className="text-sm">Total: {observations.length}</div>
          </div>

          <div>
            <div className="text-xs font-medium text-neutral-500 mb-1">Quality Grade Breakdown</div>
            <div className="space-y-1 text-sm">
              {Object.entries(qgBreakdown).map(([grade, count]) => (
                <div key={grade} className="flex justify-between">
                  <span className="capitalize">{grade.replace('_', ' ')}:</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
              {Object.keys(qgBreakdown).length === 0 && (
                <div className="text-neutral-400">No data</div>
              )}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-neutral-500 mb-1">Overlays Loaded</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Locations:</span>
                <span className="font-medium">{overlayCount.locations}</span>
              </div>
              <div className="flex justify-between">
                <span>Corridors:</span>
                <span className="font-medium">{overlayCount.corridors}</span>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
