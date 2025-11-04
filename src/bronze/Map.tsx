import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Circle as RLCircle, CircleMarker, useMapEvents } from 'react-leaflet';
import * as turf from '@turf/turf';
import { fetchOverlays, fetchObsByBbox, getFetchMethod, type Observation } from '@/lib/api-bronze';
import L from 'leaflet';
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

type MapProps = {
  dateRange: { start: string; end: string };
  qualityGrades: string[];
  logins: string[];
  onOverlayStats: (stats: { circles: number; corridors: number }) => void;
  onFetchMethod: (method: 'rpc' | 'direct' | null) => void;
};

function BoundsListener({ onBoundsChange }: { onBoundsChange: (bounds: L.LatLngBounds) => void }) {
  const map = useMapEvents({
    moveend: () => {
      onBoundsChange(map.getBounds());
    },
  });

  useEffect(() => {
    onBoundsChange(map.getBounds());
  }, []);

  return null;
}

export default function Map({ dateRange, qualityGrades, logins, onOverlayStats, onFetchMethod }: MapProps) {
  const [circles, setCircles] = useState<any[]>([]);
  const [corridors, setCorridors] = useState<any[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);

  // Load overlays once
  useEffect(() => {
    fetchOverlays()
      .then(({ circles: c, corridors: cor }) => {
        setCircles(c);
        setCorridors(cor);
        onOverlayStats({ circles: c.length, corridors: cor.length });
        
        console.log(`[Bronze] overlays: { circles: ${c.length}, corridors: ${cor.length} }`);
        
        // Expose for dev tools
        if (typeof window !== 'undefined') {
          (window as any).__bronze_zones = { circles: c, corridors: cor };
        }
      })
      .catch(err => {
        console.error('[Bronze] Failed to load overlays:', err);
        onOverlayStats({ circles: 0, corridors: 0 });
      });
  }, []);

  const loadObservations = (bounds: L.LatLngBounds) => {
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();

    fetchObsByBbox({
      sw: { lat: sw.lat, lng: sw.lng },
      ne: { lat: ne.lat, lng: ne.lng },
      dateRange,
      qg: qualityGrades.length > 0 ? qualityGrades : undefined,
      logins: logins.length > 0 ? logins : undefined,
    })
      .then(obs => {
        setObservations(obs);
        const method = getFetchMethod();
        onFetchMethod(method);
        
        if (method) {
          console.log(`[Bronze] fetch: ${method} (${obs.length} observations)`);
        }
      })
      .catch(err => console.error('[Bronze] Failed to load observations:', err));
  };

  const getQgColor = (qg: string): string => {
    switch (qg) {
      case 'research': return '#22c55e';
      case 'needs_id': return '#eab308';
      case 'casual': return '#6b7280';
      default: return '#6b7280';
    }
  };

  return (
    <div className="w-full h-full">
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
        
        <BoundsListener onBoundsChange={loadObservations} />

        {/* Circle overlays */}
        {circles.map(z => {
          if (z.lat1 != null && z.lon1 != null && z.radius_km != null) {
            return (
              <RLCircle
                key={z.zone_id}
                center={[z.lat1, z.lon1]}
                radius={z.radius_km * 1000}
                pathOptions={{ 
                  color: '#00aaff', 
                  weight: 2, 
                  opacity: 0.9, 
                  fillOpacity: 0.05 
                }}
              />
            );
          }
          return null;
        })}

        {/* Corridor overlays */}
        {corridors.map(z => {
          if (z.lat1 != null && z.lon1 != null && 
              z.lat2 != null && z.lon2 != null && 
              z.width_km != null) {
            try {
              const line = turf.lineString([[z.lon1, z.lat1], [z.lon2, z.lat2]]);
              const poly = turf.buffer(line, z.width_km / 2, { units: 'kilometers' });
              if (!poly) return null;
              
              const rings = poly.geometry.coordinates[0].map(([lng, lat]) => [lat, lng]) as [number, number][];
              
              return (
                <Polygon
                  key={z.zone_id}
                  positions={rings}
                  pathOptions={{ 
                    color: '#ffaa00', 
                    weight: 2, 
                    opacity: 0.9, 
                    fillOpacity: 0.08 
                  }}
                />
              );
            } catch (error) {
              console.error(`[Bronze] Failed to render corridor ${z.zone_id}:`, error);
              return null;
            }
          }
          return null;
        })}

        {/* Observation markers */}
        {observations.map(obs => (
          <CircleMarker
            key={obs.id}
            center={[obs.latitude, obs.longitude]}
            radius={5}
            pathOptions={{
              color: getQgColor(obs.quality_grade),
              fillColor: getQgColor(obs.quality_grade),
              fillOpacity: 0.7,
              weight: 1,
            }}
          />
        ))}
      </MapContainer>
    </div>
  );
}
