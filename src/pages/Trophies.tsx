import { useEffect, useMemo } from 'react';
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
import { getTripTrophies, getDailyTrophies } from '@/trophies';

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

  const tripTrophies = useMemo(() => {
    if (!ctx) return [];
    return getTripTrophies();
  }, [ctx]);

  const dayTrophies = useMemo(() => {
    if (!ctx) return [];
    return getDailyTrophies();
  }, [ctx]);

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
              {dayTrophies.map(trophy => (
                <Card key={trophy.slug} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/trophies/${trophy.slug}`)}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Award className="h-5 w-5 text-yellow-500" />
                      {trophy.title}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{trophy.subtitle}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
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
                  </CardContent>
                </Card>
              ))}
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
              {tripTrophies.map(trophy => (
                <Card key={trophy.slug} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/trophies/${trophy.slug}`)}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Award className="h-5 w-5 text-yellow-500" />
                      {trophy.title}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{trophy.subtitle}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
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
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Link to Gallery */}
        <div className="pt-4 border-t">
          <button
            onClick={() => navigate('/gallery')}
            className="text-primary hover:underline font-semibold"
          >
            View Trophy Gallery →
          </button>
        </div>
        
        <Legend />
      </div>
    </div>
  );
}
