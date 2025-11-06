import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/lib/state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, ExternalLink } from 'lucide-react';
import BackButton from '@/components/BackButton';

type RarityRow = {
  taxon_id: number;
  taxon_name: string;
  common_name?: string;
  photo_url?: string;
  rarity_bonus: number;
  our_count: number;
  local_count: number;
};

export default function Rarity() {
  const navigate = useNavigate();
  const { initialize } = useAppState();
  const [loading, setLoading] = useState(true);
  const [showRare, setShowRare] = useState(true);
  const [items, setItems] = useState<RarityRow[]>([]);

  useEffect(() => {
    initialize();
    loadRarity();
  }, []);

  async function loadRarity() {
    try {
      setLoading(true);
      // TODO: Implement query to v_rarity_scored_bbox
      // const { data } = await supabase
      //   .from('v_rarity_scored_bbox')
      //   .select('*')
      //   .order('rarity_bonus', { ascending: !showRare })
      //   .limit(12);
      // setItems(data || []);
      setItems([]);
    } catch (error) {
      console.error('[rarity] Failed to load:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRarity();
  }, [showRare]);

  return (
    <div className="pb-6 pb-safe-bottom">
      <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6 space-y-6">
        <div className="space-y-2">
          <BackButton />
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            Locally {showRare ? 'Rare' : 'Common'} Species
          </h1>
          <p className="text-sm text-muted-foreground">
            Species {showRare ? 'rarely' : 'commonly'} observed in this area based on local baseline data
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant={showRare ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowRare(true)}
          >
            Show Rare
          </Button>
          <Button
            variant={!showRare ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowRare(false)}
          >
            Show Common
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-lg">
            <p className="text-muted-foreground">
              Rarity data will be computed from local baseline observations
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map(item => (
              <Card key={item.taxon_id} className="overflow-hidden">
                <div className="aspect-square bg-muted flex items-center justify-center">
                  {item.photo_url ? (
                    <img
                      src={item.photo_url}
                      alt={item.taxon_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Sparkles className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                <CardContent className="p-4 space-y-2">
                  <div className="space-y-1">
                    <div className="font-semibold text-sm line-clamp-1">
                      {item.common_name || item.taxon_name}
                    </div>
                    {item.common_name && (
                      <div className="text-xs text-muted-foreground italic line-clamp-1">
                        {item.taxon_name}
                      </div>
                    )}
                  </div>
                  <div className="text-xs space-y-1">
                    <div>
                      <span className="text-muted-foreground">Rarity: </span>
                      <span className="font-semibold text-primary">
                        {item.rarity_bonus.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      Our {item.our_count} · Local {item.local_count}
                    </div>
                  </div>
                  <a
                    href={`https://www.inaturalist.org/taxa/${item.taxon_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    View on iNat <ExternalLink className="h-3 w-3" />
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
