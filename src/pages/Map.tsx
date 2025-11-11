import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { fetchTripMapPoints } from '@/lib/api';

type MapObservation = {
  inat_obs_id: number;
  user_login: string;
  latitude: number;
  longitude: number;
  taxon_name: string | null;
  observed_at_utc: string | null;
  photo_url?: string | null;
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

export default function Map() {
  const navigate = useNavigate();
  const [bbox, setBbox] = useState<{ swlat: number; swlng: number; nelat: number; nelng: number } | null>(null);
  const [observations, setObservations] = useState<MapObservation[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    async function loadMapData() {
      setDataLoading(true);
      try {
        const result = await fetchTripMapPoints();
        const points = result.data ?? [];

        if (result.error) {
          console.warn('trip map points error', result.error);
        }

        setObservations(points);

        if (points.length > 0) {
          const latitudes = points.map(p => Number(p.latitude));
          const longitudes = points.map(p => Number(p.longitude));
          setBbox({
            swlat: Math.min(...latitudes),
            swlng: Math.min(...longitudes),
            nelat: Math.max(...latitudes),
            nelng: Math.max(...longitudes),
          });
        } else {
          setBbox(null);
        }
      } catch (err) {
        console.warn('Failed to load map observations', err);
        setObservations([]);
        setBbox(null);
      } finally {
        setDataLoading(false);
      }
    }

    loadMapData();
  }, []);

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
              center={bbox ? [
                (bbox.swlat + bbox.nelat) / 2,
                (bbox.swlng + bbox.nelng) / 2
              ] : [
                observations[0]?.latitude ?? 10,
                observations[0]?.longitude ?? -84
              ]}
              zoom={bbox ? 11 : 10}
              style={{ height: '100%', width: '100%' }}
            >
              <MapInvalidator />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {observations
                .map((obs) => (
                  <CircleMarker
                    key={obs.inat_obs_id}
                    center={[Number(obs.latitude), Number(obs.longitude)]}
                    radius={6}
                    fillColor="#22c55e"
                    color="#fff"
                    weight={2}
                    fillOpacity={0.7}
                  >
                  <Popup>
                      <div className="text-sm space-y-1">
                        <div className="font-semibold">{obs.taxon_name || 'Unknown'}</div>
                        <div className="text-muted-foreground">by {obs.user_login}</div>
                        <div className="text-xs text-muted-foreground">
                          {obs.observed_at_utc ? new Date(obs.observed_at_utc).toLocaleString() : 'Unknown date'}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`https://www.inaturalist.org/observations/${obs.inat_obs_id}`, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            iNat
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/obs/${obs.inat_obs_id}`)}
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
        )}
      </div>
    </div>
  );
}
