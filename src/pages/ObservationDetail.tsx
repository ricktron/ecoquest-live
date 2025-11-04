import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

type ObsDetail = {
  id: number;
  observed_on: string;
  time_observed_at?: string;
  quality_grade: string;
  taxon?: {
    name: string;
    rank: string;
    preferred_common_name?: string;
  };
  user: {
    login: string;
  };
  photos?: Array<{
    url: string;
  }>;
  uri: string;
};

export default function ObservationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [obs, setObs] = useState<ObsDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`https://api.inaturalist.org/v1/observations/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.results?.[0]) {
          setObs(data.results[0]);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="pb-6">
        <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6 space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!obs) {
    return (
      <div className="pb-6">
        <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <p className="mt-4 text-muted-foreground">Observation not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6 space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="space-y-4">
          {obs.photos && obs.photos.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {obs.photos.slice(0, 4).map((photo, idx) => (
                <img
                  key={idx}
                  src={photo.url.replace('square', 'medium')}
                  alt="Observation"
                  className="w-full h-64 object-cover rounded-lg"
                />
              ))}
            </div>
          )}

          <div className="bg-card border rounded-lg p-6 space-y-4">
            <div>
              <h1 className="text-2xl font-bold">
                {obs.taxon?.preferred_common_name || obs.taxon?.name || 'Unknown'}
              </h1>
              {obs.taxon && (
                <p className="text-sm text-muted-foreground italic">
                  {obs.taxon.name} ({obs.taxon.rank})
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Observer</div>
                <div 
                  className="font-medium cursor-pointer hover:underline"
                  onClick={() => navigate(`/user/${obs.user.login}`)}
                >
                  {obs.user.login}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Observed</div>
                <div className="font-medium">
                  {obs.time_observed_at 
                    ? new Date(obs.time_observed_at).toLocaleString()
                    : obs.observed_on}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Quality</div>
                <div className="font-medium capitalize">{obs.quality_grade.replace('_', ' ')}</div>
              </div>
              <div>
                <div className="text-muted-foreground">ID</div>
                <div className="font-medium">#{obs.id}</div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <a
                href={obs.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                View on iNaturalist
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
