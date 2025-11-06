import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/lib/state';
import { getTripFilters } from '@/trips';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy } from 'lucide-react';
import BackButton from '@/components/BackButton';

export default function Gallery() {
  const navigate = useNavigate();
  const { loading, observations, initialize } = useAppState();

  useEffect(() => {
    initialize();
  }, []);

  const participants = useMemo(() => {
    const filters = getTripFilters();
    const userTrophies = new Map<string, Set<string>>();
    
    observations.forEach(obs => {
      if (!userTrophies.has(obs.userLogin)) {
        userTrophies.set(obs.userLogin, new Set());
      }
    });

    // Trophy mapping: slug -> short code
    const trophyMap: Record<string, string> = {
      'variety-hero': 'VH',
      'daily-variety-hero': 'DVH',
      'trailblazer': 'TB',
      'early-bird': 'EB',
      'night-owl': 'NO',
      'steady-eddie': 'SE',
      'biodiversity-set-trip': 'BD',
      'rare-find': 'RF',
      'daily-rare-find': 'DRF',
    };

    return Array.from(userTrophies.entries())
      .map(([login, trophies]) => ({
        login,
        initials: login.substring(0, 2).toUpperCase(),
        trophies: Array.from(trophies).map(t => trophyMap[t] || t.substring(0, 2).toUpperCase()),
      }))
      .sort((a, b) => a.login.localeCompare(b.login));
  }, [observations]);

  return (
    <div className="pb-6 pb-safe-bottom">
      <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6 space-y-6">
        <div className="space-y-2">
          <BackButton />
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8 text-primary" />
            Trophy Gallery
          </h1>
          <p className="text-muted-foreground">Meet the participants and their achievements</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : participants.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-lg">
            <p className="text-muted-foreground">No participants yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {participants.map(p => (
              <Card
                key={p.login}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/user/${p.login}`)}
              >
                <CardContent className="pt-6 text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary mx-auto">
                    {p.initials}
                  </div>
                  <div className="font-semibold">{p.login}</div>
                  {p.trophies.length > 0 ? (
                    <div className="flex flex-wrap gap-1 justify-center">
                      {p.trophies.map((trophy, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 bg-primary/10 rounded-full text-primary font-semibold"
                        >
                          🏆 {trophy}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">No trophies yet</div>
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
