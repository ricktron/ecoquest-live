import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/lib/state';
import DateRange from '@/components/DateRange';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Helper component to invalidate map size when container changes
function MapInvalidator() {
  const map = useMap();
  
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => clearTimeout(timer);
  }, [map]);
  
  return null;
}

export default function Map() {
  const navigate = useNavigate();
  const { loading, observations, initialize } = useAppState();

  useEffect(() => {
    initialize();
  }, []);

  return (
    <div className="pb-6">
      <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6 space-y-4">
        <h1 className="text-3xl font-bold">Map View</h1>
        
        <DateRange />

        {loading ? (
          <Skeleton className="h-[600px] w-full" />
        ) : observations.length === 0 ? (
          <div className="h-[600px] flex items-center justify-center bg-muted/30 rounded-lg">
            <p className="text-muted-foreground">No observations to display</p>
          </div>
        ) : (
          <div className="map-wrap rounded-lg overflow-hidden border">
            <MapContainer
              center={[
                observations[0]?.lat || 10,
                observations[0]?.lng || -84
              ]}
              zoom={10}
              style={{ height: '100%', width: '100%' }}
            >
              <MapInvalidator />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {observations
                .filter(obs => obs.lat && obs.lng)
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
                            <ExternalLink className="h-3 w-3 mr-1" />
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
        )}
      </div>
    </div>
  );
}
