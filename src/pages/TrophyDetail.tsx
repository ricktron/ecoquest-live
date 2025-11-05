import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppState } from '@/lib/state';
import { buildScoringContext } from '@/lib/scoring';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getTrophyBySlug, type TrophyResult } from '@/trophies';

export default function TrophyDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { loading, observations, initialize } = useAppState();
  const [results, setResults] = useState<TrophyResult[]>([]);
  const [computing, setComputing] = useState(false);

  useEffect(() => {
    initialize();
  }, []);

  const trophy = useMemo(() => {
    if (!slug) return null;
    return getTrophyBySlug(slug);
  }, [slug]);

  const ctx = useMemo(() => {
    if (!observations.length) return null;
    return buildScoringContext(observations);
  }, [observations]);

  useEffect(() => {
    if (!trophy || !ctx || observations.length === 0) return;
    
    setComputing(true);
    const today = new Date().toISOString().slice(0, 10);
    trophy.compute(observations, ctx, trophy.scope === 'daily' ? today : undefined)
      .then(res => {
        setResults(res);
        setComputing(false);
      })
      .catch(err => {
        console.error('Trophy compute error:', err);
        setComputing(false);
      });
  }, [trophy, ctx, observations]);

  if (!slug || !trophy) {
    return (
      <div className="pb-6">
        <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6">
          <Button variant="ghost" onClick={() => navigate('/trophies')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Trophies
          </Button>
          <p className="mt-4 text-muted-foreground">Trophy not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6 space-y-6">
        <Button variant="ghost" onClick={() => navigate('/trophies')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Trophies
        </Button>

        <div>
          <h1 className="text-3xl font-bold">{trophy.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{trophy.subtitle}</p>
        </div>

        {loading || computing ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No data yet</div>
        ) : (
          <div className="space-y-3">
            {results.map((entry, idx) => (
              <Card 
                key={`${entry.login}-${idx}`}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/user/${entry.login}`)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-muted-foreground w-8">#{idx + 1}</span>
                    <div>
                      <div className="font-semibold">{entry.login}</div>
                      <div className="text-sm text-muted-foreground">
                        {entry.evidence}
                      </div>
                    </div>
                  </div>
                  <div className="text-lg font-bold text-primary">
                    {entry.value.toFixed(0)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
