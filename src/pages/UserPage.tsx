import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppState } from '@/lib/state';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPoints } from '@/lib/scoring';

export default function UserPage() {
  const { login } = useParams<{ login: string }>();
  const navigate = useNavigate();
  const { loading, observations, aggregated, initialize } = useAppState();
  const [sortBy, setSortBy] = useState<'points' | 'date' | 'species'>('points');

  useEffect(() => {
    initialize();
  }, []);

  if (!login) {
    return (
      <div className="pb-6">
        <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6">
          <p className="text-muted-foreground">User not found.</p>
        </div>
      </div>
    );
  }

  const userObs = observations.filter(o => o.userLogin === login);
  const userScore = aggregated?.byUser.get(login);

  let sorted = [...userObs];
  if (sortBy === 'date') {
    sorted.sort((a, b) => (b.timeObservedAt || b.observedOn).localeCompare(a.timeObservedAt || a.observedOn));
  } else if (sortBy === 'species') {
    sorted.sort((a, b) => (a.taxonName || '').localeCompare(b.taxonName || ''));
  }

  return (
    <div className="pb-6">
      <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6 space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{login}</h1>
          {userScore && (
            <div className="flex gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">Observations: </span>
                <span className="font-semibold">{userScore.obsCount}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Species: </span>
                <span className="font-semibold">{userScore.speciesCount}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Points: </span>
                <span className="font-semibold text-primary">{formatPoints(userScore.points)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant={sortBy === 'points' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('points')}
          >
            By Points
          </Button>
          <Button
            variant={sortBy === 'date' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('date')}
          >
            By Date
          </Button>
          <Button
            variant={sortBy === 'species' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('species')}
          >
            By Species
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-lg">
            <p className="text-muted-foreground">No observations found for this user.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sorted.map(obs => (
              <div
                key={obs.id}
                className="bg-card border rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/obs/${obs.id}`)}
              >
                <div className="aspect-video bg-muted flex items-center justify-center text-muted-foreground text-sm">
                  {obs.taxonName || 'Unknown'}
                </div>
                <div className="p-3 space-y-1">
                  <div className="font-semibold text-sm line-clamp-1">
                    {obs.taxonName || 'Unknown Species'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {obs.observedOn}
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground">Quality: </span>
                    <span className="capitalize">{obs.qualityGrade.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
