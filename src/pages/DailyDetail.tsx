import { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppState } from '@/lib/state';
import { ArrowLeft, MapPin, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Chip from '@/components/Chip';
import { formatPoints } from '@/lib/scoring';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function DailyDetail() {
  const { ymd } = useParams<{ ymd: string }>();
  const navigate = useNavigate();
  const { loading, observations, aggregated, initialize } = useAppState();

  useEffect(() => {
    initialize();
  }, []);

  const dayData = useMemo(() => {
    if (!ymd || !observations.length) return null;

    const dayObs = observations.filter(o => o.observedOn === ymd);
    
    // Per-user aggregation
    const userMap = new Map<string, { login: string; points: number; obsCount: number; speciesCount: number }>();
    const speciesMap = new Map<number, { taxonName: string; count: number }>();
    
    dayObs.forEach(obs => {
      if (!userMap.has(obs.userLogin)) {
        userMap.set(obs.userLogin, {
          login: obs.userLogin,
          points: 0,
          obsCount: 0,
          speciesCount: 0,
        });
      }
      
      const u = userMap.get(obs.userLogin)!;
      u.obsCount += 1;
      // Points calculation would need context - simplified here
      u.points += 1;
      
      if (obs.taxonId && obs.taxonName) {
        if (!speciesMap.has(obs.taxonId)) {
          speciesMap.set(obs.taxonId, { taxonName: obs.taxonName, count: 0 });
        }
        speciesMap.get(obs.taxonId)!.count += 1;
      }
    });

    // Update species counts per user
    const userSpecies = new Map<string, Set<number>>();
    dayObs.forEach(obs => {
      if (!userSpecies.has(obs.userLogin)) {
        userSpecies.set(obs.userLogin, new Set());
      }
      if (obs.taxonId) {
        userSpecies.get(obs.userLogin)!.add(obs.taxonId);
      }
    });
    
    userSpecies.forEach((species, login) => {
      const u = userMap.get(login);
      if (u) u.speciesCount = species.size;
    });

    const users = Array.from(userMap.values()).sort((a, b) => b.points - a.points);
    const species = Array.from(speciesMap.values()).sort((a, b) => b.count - a.count);

    return {
      observations: dayObs,
      users,
      species,
      totalObs: dayObs.length,
      totalSpecies: speciesMap.size,
      participants: userMap.size,
    };
  }, [ymd, observations]);

  if (!ymd) {
    return <div className="p-6 text-center">Invalid date</div>;
  }

  return (
    <div className="pb-6">
      <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/daily')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{ymd}</h1>
            <p className="text-sm text-muted-foreground">
              Daily breakdown
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : !dayData || dayData.totalObs === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No observations for this date
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary">{dayData.totalObs}</div>
                    <div className="text-xs text-muted-foreground">Observations</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">{dayData.totalSpecies}</div>
                    <div className="text-xs text-muted-foreground">Species</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">{dayData.participants}</div>
                    <div className="text-xs text-muted-foreground">Participants</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Per-user list */}
            <Card>
              <CardHeader>
                <CardTitle>Contributors</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {dayData.users.map((user, idx) => (
                  <div
                    key={user.login}
                    className="flex items-center justify-between p-3 hover:bg-muted/50 rounded cursor-pointer transition-colors"
                    onClick={() => navigate(`/user/${user.login}`)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-muted-foreground">#{idx + 1}</span>
                      <div>
                        <div className="font-medium">{user.login}</div>
                        <div className="flex gap-2 mt-1">
                          <Chip variant="default">🐾 {user.speciesCount}</Chip>
                          <Chip variant="default">{user.obsCount} obs</Chip>
                        </div>
                      </div>
                    </div>
                    <div className="text-lg font-bold text-primary">
                      {formatPoints(user.points)}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Species list */}
            <Card>
              <CardHeader>
                <CardTitle>Species Observed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {dayData.species.map((sp, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{idx + 1}.</span>
                        <span className="font-medium">{sp.taxonName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">×{sp.count}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`https://www.inaturalist.org/taxa/${sp.taxonName}`, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Inline map */}
            {dayData.observations.some(o => o.lat && o.lng) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Observation Locations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px] rounded-lg overflow-hidden">
                    <MapContainer
                      center={[
                        dayData.observations.find(o => o.lat)?.lat || 10,
                        dayData.observations.find(o => o.lng)?.lng || -84
                      ]}
                      zoom={10}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      {dayData.observations
                        .filter(o => o.lat && o.lng)
                        .map(obs => (
                          <CircleMarker
                            key={obs.id}
                            center={[obs.lat!, obs.lng!]}
                            radius={6}
                            fillColor="#22c55e"
                            color="#fff"
                            weight={2}
                            fillOpacity={0.7}
                          >
                            <Popup>
                              <div className="text-sm space-y-1">
                                <div className="font-semibold">{obs.taxonName || 'Unknown'}</div>
                                <div className="text-muted-foreground">by {obs.userLogin}</div>
                                <div className="text-xs text-muted-foreground">
                                  {obs.timeObservedAt || obs.observedOn}
                                </div>
                                <div className="flex gap-2 mt-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open(`https://www.inaturalist.org/observations/${obs.id}`, '_blank')}
                                  >
                                    iNat
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => navigate(`/obs/${obs.id}`)}
                                  >
                                    Details
                                  </Button>
                                </div>
                              </div>
                            </Popup>
                          </CircleMarker>
                        ))}
                    </MapContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
