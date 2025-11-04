import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FLAGS } from '@/env';
import { useAppState } from '@/lib/state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, Crown, ArrowLeft } from 'lucide-react';
import TrophyDetail from './TrophyDetail';

export default function Trophies() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const { loading, aggregated, initialize } = useAppState();

  useEffect(() => {
    initialize();
  }, []);

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

  const trophyBuckets = [
    { slug: 'variety', title: 'Variety Hero', desc: 'Most unique species', winner: aggregated?.byUser ? Array.from(aggregated.byUser.values()).sort((a, b) => b.speciesCount - a.speciesCount)[0] : null, metric: 'speciesCount' },
    { slug: 'mammals', title: 'Most Mammals', desc: 'Top mammal observer', winner: aggregated?.byTaxonGroup.mammals[0], metric: 'obsCount' },
    { slug: 'reptiles', title: 'Most Reptiles', desc: 'Top reptile observer', winner: aggregated?.byTaxonGroup.reptiles[0], metric: 'obsCount' },
    { slug: 'birds', title: 'Most Birds', desc: 'Top bird observer', winner: aggregated?.byTaxonGroup.birds[0], metric: 'obsCount' },
    { slug: 'amphibians', title: 'Most Amphibians', desc: 'Top amphibian observer', winner: aggregated?.byTaxonGroup.amphibians[0], metric: 'obsCount' },
    { slug: 'needs-id', title: 'Most "Needs ID"', desc: 'Helping identify unknowns', winner: aggregated?.byUser ? Array.from(aggregated.byUser.values()).sort((a, b) => b.needsIdCount - a.needsIdCount)[0] : null, metric: 'needsIdCount' },
    { slug: 'research', title: 'Research Grade Leader', desc: 'Most research-grade obs', winner: aggregated?.byUser ? Array.from(aggregated.byUser.values()).sort((a, b) => b.researchCount - a.researchCount)[0] : null, metric: 'researchCount' },
  ];

  return (
    <div className="pb-6">
      <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Crown className="h-8 w-8 text-yellow-500" />
            Trophies
          </h1>
          <p className="text-sm text-muted-foreground">
            Top performers across different categories
          </p>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6, 7].map(i => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {trophyBuckets.map(trophy => (
              <Card key={trophy.title}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Award className="h-5 w-5 text-yellow-500" />
                    {trophy.title}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{trophy.desc}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {trophy.winner ? (
                    <>
                      <div 
                        className="text-center py-2 cursor-pointer hover:bg-muted/50 rounded transition-colors"
                        onClick={() => navigate(`/user/${trophy.winner.login}`)}
                      >
                        <div className="text-2xl font-bold text-primary">
                          {trophy.winner.login}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {(trophy.winner as any)[trophy.metric]} {trophy.metric === 'speciesCount' ? 'species' : trophy.metric === 'needsIdCount' ? 'needs ID' : trophy.metric === 'researchCount' ? 'research' : 'obs'}
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => navigate(`/trophies/${trophy.slug}`)}
                      >
                        View Details
                      </Button>
                    </>
                  ) : (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      No data yet
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
