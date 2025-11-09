import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FLAGS } from '@/env';
import { useAppState } from '@/lib/state';
import { buildScoringContext } from '@/lib/scoring';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, Crown, Info } from 'lucide-react';
import Legend from '@/components/Legend';
import TrophyDetail from './TrophyDetail';
import { getTripTrophies, getDailyTrophies, TrophyDef, TrophyResult } from '@/trophies';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { isLive } from '@/lib/config/profile';
import { Badge } from '@/components/ui/badge';

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

  // Early return for empty state in LIVE mode
  if (isLive && observations.length === 0 && !loading) {
    return (
      <div className="pb-6 pb-safe-bottom">
        <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6 space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Crown className="h-8 w-8 text-yellow-500" />
              Trophies
            </h1>
          </div>
          <div className="text-center py-12 bg-muted/30 rounded-lg">
            <p className="text-lg font-semibold text-muted-foreground mb-2">No winners yet</p>
            <p className="text-sm text-muted-foreground">Winners appear after the first scoring run completes.</p>
          </div>
        </div>
      </div>
    );
  }

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

      // Sort trophies: won first by value DESC, unwon by minThreshold ASC
      const sortTrophies = (trophies: TrophyWithResults[]) => {
        const won = trophies.filter(t => t.results && t.results.length > 0);
        const unwon = trophies.filter(t => !t.results || t.results.length === 0);
        
        // Won: sort by highest value DESC
        won.sort((a, b) => {
          const aMax = Math.max(...(a.results?.map(r => r.value) || [0]));
          const bMax = Math.max(...(b.results?.map(r => r.value) || [0]));
          return bMax - aMax;
        });
        
        // Unwon: sort by minThreshold ASC (easiest first)
        unwon.sort((a, b) => (a.minThreshold || 0) - (b.minThreshold || 0));
        
        return [...won, ...unwon];
      };

      setTripTrophies(sortTrophies(tripResults));
      setDayTrophies(sortTrophies(dayResults));
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
    <div className="pb-6 pb-safe-bottom">
      <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Crown className="h-8 w-8 text-yellow-500" />
            Trophies
            {isLive && <Badge variant="secondary" className="ml-2">Trip Mode</Badge>}
          </h1>
          <p className="text-sm text-muted-foreground">
            Achievement awards for outstanding contributions
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => navigate('/rarity')}
              className="text-primary hover:underline font-semibold text-sm text-left"
            >
              Wanted: Locally Rare Species →
            </button>
            <button
              onClick={() => navigate('/gallery')}
              className="text-primary hover:underline font-semibold text-sm text-left"
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
                const categoryClass = trophy.slug.includes('hazard') ? 'hazard' : 
                                     trophy.slug.includes('bird') || trophy.slug.includes('mammal') || 
                                     trophy.slug.includes('reptile') || trophy.slug.includes('amphibian') ||
                                     trophy.slug.includes('spider') || trophy.slug.includes('insect') ||
                                     trophy.slug.includes('plant') || trophy.slug.includes('fungi') ||
                                     trophy.slug.includes('mollusk') ? 'taxon' : 'daily';
                return (
                   <Card 
                    key={trophy.slug} 
                    className={`transition-shadow trophy-card ${categoryClass} ${isEmpty ? 'empty' : 'hover:shadow-lg cursor-pointer'}`}
                    onClick={() => navigate(`/trophies/${trophy.slug}`)}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Award className={`h-5 w-5 ${isEmpty ? 'text-muted-foreground' : 'text-yellow-500'}`} />
                        {trophy.title}
                        <Popover>
                          <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <button className="ml-auto p-1 hover:bg-accent rounded-full" aria-label="Trophy info">
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="text-sm max-w-sm" onClick={(e) => e.stopPropagation()}>
                            {trophy.slug === 'biodiversity-set-trip' ? (
                              <div className="space-y-2">
                                <p className="font-semibold">What is Shannon diversity (H′)?</p>
                                <p className="text-xs text-muted-foreground">
                                  A diversity score that considers both how many species you saw (richness) and how evenly your observations are spread across those species (evenness). Higher = more diverse.
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  <strong>Formula:</strong> <code className="bg-muted px-1 py-0.5 rounded">H′ = − Σ (pᵢ · ln pᵢ)</code> where pᵢ is the fraction of observations that belong to species i.
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  We require a minimum of 6 observations to avoid noisy results.
                                </p>
                              </div>
                            ) : (
                              <>
                                <p className="font-semibold mb-1">{trophy.subtitle}</p>
                                <p className="text-muted-foreground text-xs">
                                  {trophy.minThreshold ? `Minimum ${trophy.minThreshold} required` : 'No minimum threshold'}
                                </p>
                              </>
                            )}
                          </PopoverContent>
                        </Popover>
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">{trophy.subtitle}</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {isEmpty ? (
                        <p className="text-xs text-muted-foreground text-center py-2">No winner yet</p>
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
                const categoryClass = trophy.slug.includes('hazard') ? 'hazard' : 
                                     trophy.slug.includes('bird') || trophy.slug.includes('mammal') || 
                                     trophy.slug.includes('reptile') || trophy.slug.includes('amphibian') ||
                                     trophy.slug.includes('spider') || trophy.slug.includes('insect') ||
                                     trophy.slug.includes('plant') || trophy.slug.includes('fungi') ||
                                     trophy.slug.includes('mollusk') ? 'taxon' : 'trip';
                return (
                  <Card 
                    key={trophy.slug} 
                    className={`transition-shadow trophy-card ${categoryClass} ${isEmpty ? 'empty' : 'hover:shadow-lg cursor-pointer'}`}
                    onClick={() => navigate(`/trophies/${trophy.slug}`)}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Award className={`h-5 w-5 ${isEmpty ? 'text-muted-foreground' : 'text-yellow-500'}`} />
                        {trophy.title}
                        <Popover>
                          <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <button className="ml-auto p-1 hover:bg-accent rounded-full" aria-label="Trophy info">
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="text-sm max-w-sm" onClick={(e) => e.stopPropagation()}>
                            {trophy.slug === 'biodiversity-set-trip' ? (
                              <div className="space-y-2">
                                <p className="font-semibold">What is Shannon diversity (H′)?</p>
                                <p className="text-xs text-muted-foreground">
                                  A diversity score that considers both how many species you saw (richness) and how evenly your observations are spread across those species (evenness). Higher = more diverse.
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  <strong>Formula:</strong> <code className="bg-muted px-1 py-0.5 rounded">H′ = − Σ (pᵢ · ln pᵢ)</code> where pᵢ is the fraction of observations that belong to species i.
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  We require a minimum of 6 observations to avoid noisy results.
                                </p>
                              </div>
                            ) : (
                              <>
                                <p className="font-semibold mb-1">{trophy.subtitle}</p>
                                <p className="text-muted-foreground text-xs">
                                  {trophy.minThreshold ? `Minimum ${trophy.minThreshold} required` : 'No minimum threshold'}
                                </p>
                              </>
                            )}
                          </PopoverContent>
                        </Popover>
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">{trophy.subtitle}</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {isEmpty ? (
                        <p className="text-xs text-muted-foreground text-center py-2">No winner yet</p>
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
