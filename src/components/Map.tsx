import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Circle, Polygon, useMapEvents } from 'react-leaflet';
import { useFilters } from '@/state/useFilters';
import { fetchObsByBbox, getOverlays, Obs, TripLocation, TripCorridor, formatObsForPopup } from '@/lib/api-bronze';
import * as turf from '@turf/turf';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const TORTUGUERO_CENTER: [number, number] = [10.5533, -83.5170];

type ObsWithData = Obs & { observedAt: string };

type BBox = {
  swLat: number;
  swLon: number;
  neLat: number;
  neLon: number;
};

function MapEvents({ onMove }: { onMove: (bbox: BBox) => void }) {
  const map = useMapEvents({
    moveend: () => {
      const bounds = map.getBounds();
      onMove({
        swLat: bounds.getSouth(),
        swLon: bounds.getWest(),
        neLat: bounds.getNorth(),
        neLon: bounds.getEast()
      });
    }
  });

  return null;
}

function OverlayLayers({ locations, corridors }: { locations: TripLocation[]; corridors: TripCorridor[] }) {
  return (
    <>
      {locations.map((loc) => (
        <Circle
          key={loc.slug}
          center={[loc.lat, loc.lon]}
          radius={loc.radius_km * 1000}
          pathOptions={{ color: 'blue', fillColor: 'lightblue', fillOpacity: 0.2, weight: 2 }}
        >
          <Popup>{loc.label}</Popup>
        </Circle>
      ))}
      {corridors.map((cor) => {
        const line = turf.lineString([[cor.lon1, cor.lat1], [cor.lon2, cor.lat2]]);
        const buffered = turf.buffer(line, cor.width_km / 2, { units: 'kilometers' });
        const coords = buffered.geometry.coordinates[0].map(([lon, lat]) => [lat, lon] as [number, number]);
        
        return (
          <Polygon
            key={cor.slug}
            positions={coords}
            pathOptions={{ color: 'green', fillColor: 'lightgreen', fillOpacity: 0.15, weight: 2 }}
          >
            <Popup>{cor.label}</Popup>
          </Polygon>
        );
      })}
    </>
  );
}

export default function Map({ onObsUpdate }: { onObsUpdate: (obs: ObsWithData[]) => void }) {
  const { bbox, dateRange, qg, logins, setBbox } = useFilters();
  const [observations, setObservations] = useState<ObsWithData[]>([]);
  const [overlays, setOverlays] = useState<{ locations: TripLocation[]; corridors: TripCorridor[] }>({
    locations: [],
    corridors: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout>();
  const cacheKey = useRef('');

  // Load overlays on mount
  useEffect(() => {
    getOverlays().then(setOverlays).catch(console.error);
  }, []);

  // Fetch observations when filters change
  useEffect(() => {
    if (!bbox) return;

    const newCacheKey = JSON.stringify({ bbox, dateRange, qg, logins });
    if (newCacheKey === cacheKey.current) return;

    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      cacheKey.current = newCacheKey;
      setIsLoading(true);
      
      try {
        const data = await fetchObsByBbox({
          swLat: bbox.swLat,
          swLon: bbox.swLon,
          neLat: bbox.neLat,
          neLon: bbox.neLon,
          dFrom: dateRange.from.toISOString(),
          dTo: dateRange.to.toISOString(),
          qg,
          logins: logins.length > 0 ? logins : undefined
        });

        const withObservedAt = data.map(obs => ({
          ...obs,
          observedAt: obs.observed_at_utc || obs.time_observed_at || ''
        }));

        setObservations(withObservedAt);
        onObsUpdate(withObservedAt);
      } catch (error) {
        console.error('[Map] Error fetching observations:', error);
        setObservations([]);
        onObsUpdate([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer.current);
  }, [bbox, dateRange, qg, logins, onObsUpdate]);

  const handleMapMove = (newBbox: BBox) => {
    setBbox(newBbox);
  };

  const getQgColor = (grade: string) => {
    switch (grade) {
      case 'research': return '#4CAF50';
      case 'needs_id': return '#FFC107';
      case 'casual': return '#9E9E9E';
      default: return '#2196F3';
    }
  };

  return (
    <div className="relative h-full">
      {isLoading && (
        <div className="absolute top-4 right-4 z-[1000] bg-white px-3 py-2 rounded shadow text-sm">
          Loading observations...
        </div>
      )}
      <MapContainer
        center={TORTUGUERO_CENTER}
        zoom={11}
        className="h-full w-full"
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEvents onMove={handleMapMove} />
        <OverlayLayers locations={overlays.locations} corridors={overlays.corridors} />
        
        {observations.map((obs) => {
          const formatted = formatObsForPopup(obs);
          return (
            <CircleMarker
              key={obs.inat_obs_id}
              center={[obs.latitude, obs.longitude]}
              radius={6}
              pathOptions={{ 
                color: getQgColor(obs.quality_grade),
                fillColor: getQgColor(obs.quality_grade),
                fillOpacity: 0.7,
                weight: 2
              }}
            >
              <Popup>
                <div className="space-y-2">
                  {formatted.photo && (
                    <img
                      src={formatted.photo}
                      alt={formatted.name}
                      className="w-full h-32 object-cover rounded"
                    />
                  )}
                  <div className="font-semibold">{formatted.name}</div>
                  <div className="text-sm text-neutral-600">by {formatted.user}</div>
                  <div className="flex items-center gap-2">
                    <Badge variant={formatted.qg === 'research' ? 'default' : 'secondary'}>
                      {formatted.qg}
                    </Badge>
                    <span className="text-xs text-neutral-500">
                      {formatted.observedAt && format(new Date(formatted.observedAt), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
