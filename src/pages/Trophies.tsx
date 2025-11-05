import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FLAGS } from '@/env';
import { useAppState } from '@/lib/state';
import { buildScoringContext } from '@/lib/scoring';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, Crown } from 'lucide-react';
import Legend from '@/components/Legend';
import TrophyDetail from './TrophyDetail';
import { getTripTrophies, getDailyTrophies, TrophyDef, TrophyResult } from '@/trophies';

type TrophyWithResults = TrophyDef & { results?: TrophyResult[] };

export default function Trophies() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const { loading, aggregated, observations, initialize } = useAppState();

  useEffect(() => {
    initialize();
  }, []);

  const ctx = useMemo(() => {
    if (!observations.length) return null;
    return buildScoringContext(observations);
  }, [observations]);

  const [tripTrophies, setTripTrophies] = useState<TrophyWithResults[]>([]);
  const [dayTrophies, setDayTrophies] = useState<TrophyWithResults[]>([]);

  useEffect(() => {
    if (!ctx || !observations.length) return;

    async function computeTrophies() {
      const today = new Date().toISOString().split('T')[0];
      
      const tripDefs = getTripTrophies();
      const dayDefs = getDailyTrophies();

      const tripResults = await Promise.all(
        tripDefs.map(async (def) => {
          const results = await def.compute(observations, ctx);
          return { ...def, results };
        })
      );

      const dayResults = await Promise.all(
        dayDefs.map(async (def) => {
          const results = await def.compute(observations, ctx, today);
          return { ...def, results };
        })
      );

      setTripTrophies(tripResults);
      setDayTrophies(dayResults);
    }

    computeTrophies();
  }, [ctx, observations]);

  // If we have a slug, render the detail page
  if (slug) {
    return <TrophyDetail />;
  }

  if (!FLAGS.TROPHIES_ENABLED) {
    return (
      <div className="pb-6">
        <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-12 text-center">
          <h2 className="text-xl font-semibold mb-2">Trophies</h2>
          <p className="text-muted-foreground">
            Trophy features are currently disabled.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Crown className="h-8 w-8 text-yellow-500" />
            Trophies
          </h1>
          <p className="text-sm text-muted-foreground">
            Achievement awards for outstanding contributions
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigate('/gallery')}
              className="text-primary hover:underline font-semibold text-sm"
            >
              View Trophy Gallery →
            </button>
          </div>
        </div>

        {/* Daily Trophies */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Daily Trophies</h2>
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-40 w-full" />
              ))}
            </div>
          ) : dayTrophies.length === 0 ? (
            <div className="text-center py-8 bg-muted/30 rounded-lg">
              <p className="text-muted-foreground">No data yet for daily trophies.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {dayTrophies.map(trophy => {
                const isEmpty = !trophy.results || trophy.results.length === 0;
                return (
                  <Card 
                    key={trophy.slug} 
                    className={`transition-shadow ${isEmpty ? 'trophy-card empty' : 'hover:shadow-lg cursor-pointer trophy-card'}`}
                    onClick={() => !isEmpty && navigate(`/trophies/${trophy.slug}`)}
                    aria-disabled={isEmpty}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Award className="h-5 w-5 text-yellow-500" />
                        {trophy.title}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">{trophy.subtitle}</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {isEmpty ? (
                        <p className="text-xs text-muted-foreground text-center py-2">No data yet</p>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/trophies/${trophy.slug}`);
                          }}
                        >
                          View Details
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Trip Trophies */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Trip Trophies</h2>
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Skeleton key={i} className="h-40 w-full" />
              ))}
            </div>
          ) : tripTrophies.length === 0 ? (
            <div className="text-center py-8 bg-muted/30 rounded-lg">
              <p className="text-muted-foreground">No data yet for trip trophies.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tripTrophies.map(trophy => {
                const isEmpty = !trophy.results || trophy.results.length === 0;
                return (
                  <Card 
                    key={trophy.slug} 
                    className={`transition-shadow ${isEmpty ? 'trophy-card empty' : 'hover:shadow-lg cursor-pointer trophy-card'}`}
                    onClick={() => !isEmpty && navigate(`/trophies/${trophy.slug}`)}
                    aria-disabled={isEmpty}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Award className="h-5 w-5 text-yellow-500" />
                        {trophy.title}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">{trophy.subtitle}</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {isEmpty ? (
                        <p className="text-xs text-muted-foreground text-center py-2">No data yet</p>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/trophies/${trophy.slug}`);
                          }}
                        >
                          View Details
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
        
        <Legend />
      </div>
    </div>
  );
}
