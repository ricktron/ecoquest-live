import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import { useAppState } from '@/lib/state';
import DateRange from '@/components/DateRange';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

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
    <div className="min-h-screen pb-20 md:pb-6">
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
                radius={5}
                pathOptions={{
                  color: getQgColor(obs.qualityGrade),
                  fillColor: getQgColor(obs.qualityGrade),
                  fillOpacity: 0.7,
                  weight: 1,
                }}
              />
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
