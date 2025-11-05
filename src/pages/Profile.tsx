import { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppState } from '@/lib/state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy, Camera, Leaf, Award } from 'lucide-react';

export default function Profile() {
  const { login } = useParams<{ login: string }>();
  const navigate = useNavigate();
  const { loading, aggregated, observations, initialize } = useAppState();

  useEffect(() => {
    initialize();
  }, []);

  const userStats = useMemo(() => {
    if (!aggregated || !login) return null;
    
    const userAgg = aggregated.byUser.get(login);
    if (!userAgg) return null;

    const userObs = observations.filter(o => o.userLogin === login);
    const rank = Array.from(aggregated.byUser.values())
      .sort((a, b) => b.points - a.points)
      .findIndex(u => u.login === login) + 1;

    return {
      ...userAgg,
      rank,
      observations: userObs,
    };
  }, [aggregated, observations, login]);

  if (loading) {
    return (
      <div className="pb-6">
        <div className="max-w-3xl mx-auto px-3 md:px-6 py-6">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!userStats || !login) {
    return (
      <div className="pb-6">
        <div className="max-w-3xl mx-auto px-3 md:px-6 py-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <p className="text-muted-foreground">User not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <div className="max-w-3xl mx-auto px-3 md:px-6 py-6 space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{login}</h1>
          <div className="flex gap-2 items-center">
            <Badge variant="secondary">Rank #{userStats.rank}</Badge>
            <Badge variant="outline">{userStats.points.toFixed(1)} pts</Badge>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Camera className="h-4 w-4 text-muted-foreground" />
                Observations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{userStats.obsCount}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Leaf className="h-4 w-4 text-muted-foreground" />
                Species
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{userStats.speciesCount}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Award className="h-4 w-4 text-muted-foreground" />
                Research Grade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{userStats.researchCount || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Photo Mosaic */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Recent Observations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
              {userStats.observations.slice(0, 24).map((obs, i) => (
                <a
                  key={`${obs.id}-${i}`}
                  href={obs.uri || `https://www.inaturalist.org/observations/${obs.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aspect-square bg-muted rounded overflow-hidden hover:opacity-80 transition-opacity"
                  title={obs.taxonName || 'Unknown'}
                >
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                    <Camera className="h-6 w-6" />
                  </div>
                </a>
              ))}
            </div>
            {userStats.observations.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No observations yet</p>
            )}
          </CardContent>
        </Card>

        {/* Trophies */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Trophies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Trophy tracking coming soon</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
