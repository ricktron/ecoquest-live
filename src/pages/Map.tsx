import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import {
  fetchObsLatest10CR2025,
  fetchObsAllCR2025,
  getRosterCR2025,
  getTripParams,
  type TripLatestObservationRow,
  type TripParams,
} from '@/lib/api';

type MapObservation = {
  inat_obs_id: number | null;
  user_login: string;
  latitude: number;
  longitude: number;
  observed_at_utc: string | null;
};

const TORTUGUERO_BOUNDS: [[number, number], [number, number]] = [
  [10.3, -83.9],
  [10.7, -83.4],
];

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
  const [latestWindow, setLatestWindow] = useState<Array<TripLatestObservationRow & { latitude: number; longitude: number }>>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [nameMap, setNameMap] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    async function loadMapData() {
      setDataLoading(true);
      try {
        const [baseResult, paramsResult, rosterResult, latestResult] = await Promise.all([
          fetchObsAllCR2025(),
          getTripParams(),
          getRosterCR2025(),
          fetchObsLatest10CR2025(),
        ]);

        const filteredBase = (baseResult.data ?? [])
          .filter((row) => row.latitude != null && row.longitude != null)
          .map((row) => ({
            inat_obs_id: row.inat_obs_id,
            user_login: row.user_login,
            latitude: Number(row.latitude),
            longitude: Number(row.longitude),
            observed_at_utc: row.observed_at_utc ?? null,
          } satisfies MapObservation));

        setObservations(filteredBase);
        setParams(paramsResult.data ?? null);

        const latestPoints = (latestResult.data ?? [])
          .map((row) => ({
            user_login: (row?.user_login ?? '').toString(),
            inat_obs_id: row?.inat_obs_id != null ? Number(row.inat_obs_id) : null,
            observed_at_utc: row?.observed_at_utc ?? null,
            latitude: row?.latitude != null ? Number(row.latitude) : null,
            longitude: row?.longitude != null ? Number(row.longitude) : null,
          } satisfies TripLatestObservationRow))
          .filter((row) => row.user_login && row.latitude != null && row.longitude != null);
        setLatestWindow(latestPoints as Array<TripLatestObservationRow & { latitude: number; longitude: number }>);

        const rosterMap = (rosterResult.data ?? []).reduce<Record<string, string>>((acc, row) => {
          const key = row.user_login.toLowerCase();
          if (key) {
            acc[key] = row.nameForUi;
          }
          return acc;
        }, {});
        setNameMap(rosterMap);

        const errors: string[] = [];
        if (baseResult.error?.message) errors.push(baseResult.error.message);
        if (paramsResult.error?.message) errors.push(paramsResult.error.message);
        if (rosterResult.error?.message) errors.push(rosterResult.error.message);
        if (latestResult.error?.message) errors.push(latestResult.error.message);
        if (errors.length) {
          console.warn('map data errors', errors.join('; '));
        }

        const warningList: string[] = [];
        if (baseResult.missing) warningList.push('Observation view is unavailable.');
        if (rosterResult.missing) warningList.push('Roster view is unavailable; display names limited.');
        if (latestResult.missing) warningList.push('Latest observation window view is unavailable.');
        setWarnings(warningList);
      } catch (err) {
        console.warn('Failed to load map observations', err);
        setObservations([]);
        setParams(null);
        setLatestWindow([]);
      } finally {
        setDataLoading(false);
      }
    }

    loadMapData();
  }, []);

  const getDisplayName = (login: string) => nameMap[login.toLowerCase()] ?? login;
  const latestBounds = latestWindow.length >= 10
    ? ([
        [
          Math.min(...latestWindow.map((obs) => Number(obs.latitude))),
          Math.min(...latestWindow.map((obs) => Number(obs.longitude))),
        ],
        [
          Math.max(...latestWindow.map((obs) => Number(obs.latitude))),
          Math.max(...latestWindow.map((obs) => Number(obs.longitude))),
        ],
      ] as [[number, number], [number, number]])
    : null;

  const fallbackBounds = latestBounds ? null : TORTUGUERO_BOUNDS;

  const bounds = latestBounds ?? fallbackBounds;

  return (
    <div className="pb-6">
      <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6 space-y-4">
        <h1 className="text-3xl font-bold">Map</h1>

        {!dataLoading && warnings.length > 0 && (
          <div className="space-y-2">
            {warnings.map((message) => (
              <div
                key={message}
                className="px-3 py-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md"
              >
                {message}
              </div>
            ))}
          </div>
        )}
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
                const prettyName = getDisplayName(obs.user_login);
                const showSecondary = prettyName.toLowerCase() !== obs.user_login.toLowerCase();
                const formattedTime = obs.observed_at_utc
                  ? new Date(obs.observed_at_utc).toLocaleString('en-US', {
                      timeZone: params?.tz ?? 'America/Costa_Rica',
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })
                  : null;
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
                        <div className="font-semibold text-foreground">{obs.user_login}</div>
                        {showSecondary && (
                          <div className="text-xs text-muted-foreground">{prettyName}</div>
                        )}
                        {formattedTime && (
                          <div className="text-[11px] text-muted-foreground">{formattedTime}</div>
                        )}
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
