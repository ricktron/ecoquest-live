import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { getTripBasePoints, getTripParams, getTripRoster, type TripParams } from '@/lib/api';

type MapObservation = {
  inat_obs_id: number | null;
  user_login: string;
  latitude: number;
  longitude: number;
};

// Helper component to invalidate map size when container changes
function MapInvalidator() {
  const map = useMap();
  
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => clearTimeout(timer);
  }, [map]);
  
  useEffect(() => {
    // Disable scroll wheel zoom so page can scroll; enable on focus if desired
    map.scrollWheelZoom.disable();
    
    const handleFocus = () => map.scrollWheelZoom.enable();
    const handleBlur = () => map.scrollWheelZoom.disable();
    
    map.on('focus', handleFocus);
    map.on('blur', handleBlur);
    
    return () => {
      map.off('focus', handleFocus);
      map.off('blur', handleBlur);
    };
  }, [map]);
  
  return null;
}

function TripBounds({ bounds }: { bounds: [[number, number], [number, number]] }) {
  const map = useMap();

  useEffect(() => {
    if (!bounds) return;
    map.fitBounds(bounds, { padding: [24, 24] });
  }, [map, bounds]);

  return null;
}

export default function Map() {
  const navigate = useNavigate();
  const [params, setParams] = useState<TripParams | null>(null);
  const [observations, setObservations] = useState<MapObservation[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [nameMap, setNameMap] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadMapData() {
      setDataLoading(true);
      try {
        const [baseResult, paramsResult, rosterResult] = await Promise.all([
          getTripBasePoints(),
          getTripParams(),
          getTripRoster(),
        ]);

        const filtered = (baseResult.data ?? [])
          .filter((row) => row.latitude != null && row.longitude != null)
          .map((row) => ({
            inat_obs_id: row.inat_obs_id,
            user_login: row.user_login,
            latitude: Number(row.latitude),
            longitude: Number(row.longitude),
          } satisfies MapObservation));

        setObservations(filtered);
        setParams(paramsResult.data ?? null);

        const rosterMap = (rosterResult.data ?? []).reduce<Record<string, string>>((acc, row) => {
          const key = row.user_login.toLowerCase();
          if (key) {
            acc[key] = row.display_name ?? row.user_login;
          }
          return acc;
        }, {});
        setNameMap(rosterMap);

        const errors: string[] = [];
        if (baseResult.error?.message) errors.push(baseResult.error.message);
        if (paramsResult.error?.message) errors.push(paramsResult.error.message);
        if (rosterResult.error?.message) errors.push(rosterResult.error.message);
        if (errors.length) {
          console.warn('map data errors', errors.join('; '));
        }
      } catch (err) {
        console.warn('Failed to load map observations', err);
        setObservations([]);
        setParams(null);
      } finally {
        setDataLoading(false);
      }
    }

    loadMapData();
  }, []);

  const getDisplayName = (login: string) => nameMap[login.toLowerCase()] ?? login;

  const bounds = params
    ? [
        [params.lat_min, params.lon_min] as [number, number],
        [params.lat_max, params.lon_max] as [number, number],
      ]
    : null;

  return (
    <div className="pb-6">
      <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6 space-y-4">
        <h1 className="text-3xl font-bold">Map</h1>

        {dataLoading ? (
          <Skeleton className="h-[600px] w-full" />
        ) : observations.length === 0 ? (
          <div className="h-[600px] flex items-center justify-center bg-muted/30 rounded-lg">
            <div className="text-center">
              <p className="text-lg font-semibold text-muted-foreground mb-2">No observations to display</p>
              <p className="text-sm text-muted-foreground">Observations will appear here as they're recorded</p>
            </div>
          </div>
        ) : (
          <div className="map-wrap rounded-lg overflow-hidden border">
            <MapContainer
              center={bounds ? [
                (bounds[0][0] + bounds[1][0]) / 2,
                (bounds[0][1] + bounds[1][1]) / 2,
              ] : [
                observations[0]?.latitude ?? 10,
                observations[0]?.longitude ?? -84,
              ]}
              zoom={bounds ? 12 : 10}
              style={{ height: '100%', width: '100%' }}
            >
              <MapInvalidator />
              {bounds && <TripBounds bounds={bounds} />}
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {observations.map((obs, idx) => {
                const obsId = obs.inat_obs_id;
                const markerKey = obsId ?? `${obs.user_login}-${idx}`;
                return (
                  <CircleMarker
                    key={markerKey}
                    center={[Number(obs.latitude), Number(obs.longitude)]}
                    radius={6}
                    fillColor="#22c55e"
                    color="#fff"
                    weight={2}
                    fillOpacity={0.7}
                  >
                    <Popup>
                      <div className="text-sm space-y-1">
                        <div className="font-semibold">{getDisplayName(obs.user_login)}</div>
                        <div className="text-xs text-muted-foreground">{obs.user_login}</div>
                        {obsId ? (
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(`https://www.inaturalist.org/observations/${obsId}`, '_blank')}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              iNat
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/obs/${obsId}`)}
                            >
                              Details
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>
        )}
      </div>
    </div>
  );
}
