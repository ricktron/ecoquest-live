import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/lib/state';
import DateRange from '@/components/DateRange';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Map as MapIcon, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import dayjs from 'dayjs';

// Fix default marker icon
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const TORTUGUERO_CENTER: [number, number] = [10.5533, -83.5170];
const DEFAULT_ZOOM = 11;

export default function Map() {
  const navigate = useNavigate();
  const { observations, initialize } = useAppState();

  useEffect(() => {
    initialize();
  }, []);

  const getQgColor = (qg: string): string => {
    switch (qg) {
      case 'research': return '#22c55e';
      case 'needs_id': return '#eab308';
      case 'casual': return '#6b7280';
      default: return '#6b7280';
    }
  };

  return (
    <div className="pb-6">
      <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6 space-y-4">
        <h1 className="text-3xl font-bold">Map View</h1>
        
        <DateRange />

        <div className="h-[60vh] md:h-[70vh] rounded-lg overflow-hidden border">
          <MapContainer
            center={TORTUGUERO_CENTER}
            zoom={DEFAULT_ZOOM}
            className="w-full h-full"
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {observations.map(obs => (
              <CircleMarker
                key={obs.id}
                center={[obs.lat, obs.lng]}
                radius={6}
                fillColor="#3b82f6"
                fillOpacity={0.6}
                stroke={true}
                color="#1d4ed8"
                weight={1}
              >
                <Popup>
                  <div className="space-y-2 min-w-[200px]">
                    <div>
                      <div className="font-semibold">{obs.taxonName || 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground">
                        {obs.userLogin} • {obs.timeObservedAt ? new Date(obs.timeObservedAt).toLocaleString() : obs.observedOn}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => navigate(`/obs/${obs.id}`)}
                      >
                        View Details
                      </Button>
                      {obs.uri && (
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                        >
                          <a
                            href={obs.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1"
                          >
                            iNat <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        <div className="text-sm text-muted-foreground">
          Showing {observations.length} observations
        </div>
      </div>
    </div>
  );
}
