import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/lib/state';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/integrations/supabase/client';

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
  const { loading, initialize } = useAppState();
  const [bbox, setBbox] = useState<{ swlat: number; swlng: number; nelat: number; nelng: number } | null>(null);
  const [observations, setObservations] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    initialize();
    
    async function loadMapData() {
      setDataLoading(true);
      
      // Fetch bounding box from config_filters.flags.bbox
      const { data: cfg }: any = await supabase
        .from('config_filters')
        .select('flags')
        .eq('id', true)
        .maybeSingle();
      
      const bboxData = (cfg?.flags as any)?.bbox || null;
      if (bboxData && bboxData.swlat && bboxData.swlng && bboxData.nelat && bboxData.nelng) {
        setBbox({
          swlat: bboxData.swlat,
          swlng: bboxData.swlng,
          nelat: bboxData.nelat,
          nelng: bboxData.nelng
        });
      }
      
      // Fetch latest run id
      const { data: latest }: any = await supabase
        .from('latest_run_v' as any)
        .select('run_id')
        .maybeSingle();
      
      const latestRun = latest?.run_id ?? null;
      
      // Fetch observations filtered by latest run
      if (latestRun) {
        const { data: points }: any = await supabase
          .from('observations' as any)
          .select('*')
          .eq('run_id', latestRun);
        setObservations(points || []);
      } else {
        setObservations([]);
      }
      
      setDataLoading(false);
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
                observations[0]?.lat || 10,
                observations[0]?.lng || -84
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
