import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Circle as RLCircle } from 'react-leaflet';
import * as turf from '@turf/turf';
import { TROPHIES_ON } from '@/lib/flags';
import { getZones, type ZoneRow } from '@/lib/api-bronze';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in production
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

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
  const [zones, setZones] = useState<ZoneRow[]>([]);

  useEffect(() => {
    if (!TROPHIES_ON) return;
    
    getZones()
      .then(z => {
        setZones(z);
        
        // Dev sanity check
        const circles = z.filter(zone => zone.zone_type === 'circle').length;
        const corridors = z.filter(zone => zone.zone_type === 'corridor').length;
        console.log('[Bronze] Zones loaded:', { total: z.length, circles, corridors });
        
        // Optional: expose for DevTools inspection
        if (typeof window !== 'undefined') {
          (window as any).__bronze_zones = z;
        }
      })
      .catch(err => console.error('Failed to load zones', err));
  }, []);

  return (
    <div className="relative w-full h-[600px] rounded-lg overflow-hidden shadow-lg">
      <MapContainer
        center={TORTUGUERO_CENTER}
        zoom={DEFAULT_ZOOM}
        className="w-full h-full"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Zone overlays */}
        {TROPHIES_ON && zones.map(z => {
          // Circle zones
          if (z.zone_type === 'circle' && z.lat1 != null && z.lon1 != null && z.radius_km != null) {
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
          
          // Corridor zones
          if (z.zone_type === 'corridor' &&
              z.lat1 != null && z.lon1 != null && 
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
              console.error(`Failed to render corridor ${z.zone_id}:`, error);
              return null;
            }
          }
          
          return null;
        })}
      </MapContainer>
    </div>
  );
}
