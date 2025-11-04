import { useEffect, useState } from 'react';
import { fetchObsByBbox, type Observation } from '@/lib/api-bronze';

type FeedProps = {
  dateRange: { start: string; end: string };
  qualityGrades: string[];
  logins: string[];
};

export default function Feed({ dateRange, qualityGrades, logins }: FeedProps) {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    
    // Load recent observations (no bbox filter, just latest)
    fetchObsByBbox({
      sw: { lat: -90, lng: -180 },
      ne: { lat: 90, lng: 180 },
      dateRange,
      qg: qualityGrades.length > 0 ? qualityGrades : undefined,
      logins: logins.length > 0 ? logins : undefined,
    })
      .then(obs => {
        // Sort by date descending and take top 50
        const sorted = obs.sort((a, b) => 
          new Date(b.observed_on).getTime() - new Date(a.observed_on).getTime()
        ).slice(0, 50);
        setObservations(sorted);
      })
      .catch(err => console.error('[Feed] Failed to load observations:', err))
      .finally(() => setLoading(false));
  }, [dateRange, qualityGrades, logins]);

  if (loading) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Loading observations...
      </div>
    );
  }

  if (observations.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No observations found
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      <h3 className="font-semibold text-sm mb-3">Recent Observations ({observations.length})</h3>
      {observations.map(obs => (
        <div key={obs.id} className="p-2 bg-muted/50 rounded text-xs space-y-1">
          <div className="font-medium">{obs.user_login}</div>
          <div className="text-muted-foreground">
            {new Date(obs.observed_on).toLocaleDateString()}
          </div>
          <div>
            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${
              obs.quality_grade === 'research' ? 'bg-green-500 text-white' :
              obs.quality_grade === 'needs_id' ? 'bg-yellow-500 text-white' :
              'bg-gray-500 text-white'
            }`}>
              {obs.quality_grade}
            </span>
          </div>
          <div className="text-muted-foreground">
            {obs.latitude.toFixed(4)}, {obs.longitude.toFixed(4)}
          </div>
        </div>
      ))}
    </div>
  );
}
