import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppState } from '@/lib/state';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatPoints } from '@/lib/scoring';

type TrophyCategory = 'variety' | 'mammals' | 'reptiles' | 'birds' | 'amphibians' | 'needs-id' | 'research';

const TROPHY_META: Record<TrophyCategory, { title: string; desc: string; metric: string }> = {
  variety: { title: 'Variety Hero', desc: 'Most unique species', metric: 'speciesCount' },
  mammals: { title: 'Most Mammals', desc: 'Top mammal observer', metric: 'obsCount' },
  reptiles: { title: 'Most Reptiles', desc: 'Top reptile observer', metric: 'obsCount' },
  birds: { title: 'Most Birds', desc: 'Top bird observer', metric: 'obsCount' },
  amphibians: { title: 'Most Amphibians', desc: 'Top amphibian observer', metric: 'obsCount' },
  'needs-id': { title: 'Most "Needs ID"', desc: 'Helping identify unknowns', metric: 'needsIdCount' },
  research: { title: 'Research Grade Leader', desc: 'Most research-grade obs', metric: 'researchCount' },
};

export default function TrophyDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { loading, aggregated, initialize } = useAppState();

  useEffect(() => {
    initialize();
  }, []);

  if (!slug || !(slug in TROPHY_META)) {
    return (
      <div className="pb-6">
        <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6">
          <Button variant="ghost" onClick={() => navigate('/trophies')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Trophies
          </Button>
          <p className="mt-4 text-muted-foreground">Trophy category not found.</p>
        </div>
      </div>
    );
  }

  const category = slug as TrophyCategory;
  const meta = TROPHY_META[category];

  let leaderboard: any[] = [];
  if (aggregated && !loading) {
    if (category === 'variety') {
      leaderboard = Array.from(aggregated.byUser.values()).sort((a, b) => b.speciesCount - a.speciesCount);
    } else if (category === 'needs-id') {
      leaderboard = Array.from(aggregated.byUser.values()).sort((a, b) => b.needsIdCount - a.needsIdCount);
    } else if (category === 'research') {
      leaderboard = Array.from(aggregated.byUser.values()).sort((a, b) => b.researchCount - a.researchCount);
    } else if (['mammals', 'reptiles', 'birds', 'amphibians'].includes(category)) {
      leaderboard = aggregated.byTaxonGroup[category as keyof typeof aggregated.byTaxonGroup];
    }
  }

  return (
    <div className="pb-6">
      <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6 space-y-6">
        <Button variant="ghost" onClick={() => navigate('/trophies')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Trophies
        </Button>

        <div>
          <h1 className="text-3xl font-bold">{meta.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{meta.desc}</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No data yet</div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((entry, idx) => (
              <Card 
                key={entry.login}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/user/${entry.login}`)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-muted-foreground w-8">#{idx + 1}</span>
                    <div>
                      <div className="font-semibold">{entry.login}</div>
                      <div className="text-sm text-muted-foreground">
                        {(entry as any)[meta.metric]} {meta.metric === 'speciesCount' ? 'species' : meta.metric === 'needsIdCount' ? 'needs ID' : meta.metric === 'researchCount' ? 'research' : 'obs'}
                      </div>
                    </div>
                  </div>
                  <div className="text-lg font-bold text-primary">
                    {formatPoints(entry.points)} pts
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
