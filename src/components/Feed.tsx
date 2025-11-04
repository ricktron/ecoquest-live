import { useState } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

type ObsWithData = {
  inat_obs_id: number;
  user_login: string;
  latitude: number;
  longitude: number;
  quality_grade: string;
  taxon_name?: string;
  species_guess?: string;
  photo_url?: string;
  observedAt: string;
};

export default function Feed({ observations }: { observations: ObsWithData[] }) {
  const [displayCount, setDisplayCount] = useState(200);

  const sortedObs = [...observations].sort((a, b) => {
    const dateA = new Date(a.observedAt || 0).getTime();
    const dateB = new Date(b.observedAt || 0).getTime();
    return dateB - dateA;
  });

  const displayedObs = sortedObs.slice(0, displayCount);
  const hasMore = sortedObs.length > displayCount;

  if (observations.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-400">
        <div className="text-center">
          <p className="text-lg">No observations found</p>
          <p className="text-sm mt-2">Try adjusting your filters or moving the map</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b bg-white">
        <div className="text-sm font-medium">
          {observations.length} observation{observations.length !== 1 ? 's' : ''}
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {displayedObs.map((obs) => {
            const name = obs.taxon_name || obs.species_guess || 'Unknown';
            
            return (
              <div key={obs.inat_obs_id} className="bg-white border rounded-lg p-3 hover:shadow-md transition-shadow">
                <div className="flex gap-3">
                  {obs.photo_url && (
                    <img
                      src={obs.photo_url}
                      alt={name}
                      className="w-20 h-20 object-cover rounded flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{name}</div>
                    <div className="text-sm text-neutral-600 mt-1">by {obs.user_login}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge 
                        variant={obs.quality_grade === 'research' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {obs.quality_grade}
                      </Badge>
                      {obs.observedAt && (
                        <span className="text-xs text-neutral-500">
                          {format(new Date(obs.observedAt), 'MMM d, yyyy h:mm a')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {hasMore && (
            <div className="text-center py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDisplayCount(prev => prev + 100)}
              >
                Load more
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
