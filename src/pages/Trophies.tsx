import { useEffect, useState } from 'react';
import { FLAGS } from '../env';
import { getZones, type ZoneRow } from '@/lib/api-bronze';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Trophies() {
  const [zones, setZones] = useState<ZoneRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!FLAGS.TROPHIES_ENABLED) return;

    getZones()
      .then(z => setZones(z))
      .catch(err => console.error('[Trophies] Failed to load zones:', err))
      .finally(() => setLoading(false));
  }, []);

  if (!FLAGS.TROPHIES_ENABLED) {
    return (
      <div className="p-4">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Trophies</h2>
          <p className="text-muted-foreground">
            Trophy features are currently disabled.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Trophy Zones</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Read-only view of all configured trophy zones
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading zones...
        </div>
      ) : zones.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No trophy zones configured</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {zones.map(zone => (
            <Card key={zone.zone_id}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {zone.label || zone.slug}
                </CardTitle>
                <div className="text-xs text-muted-foreground uppercase">
                  {zone.zone_type}
                </div>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                {zone.zone_type === 'circle' && (
                  <>
                    <div>
                      <span className="font-medium">Center:</span>{' '}
                      {zone.lat1?.toFixed(4)}, {zone.lon1?.toFixed(4)}
                    </div>
                    <div>
                      <span className="font-medium">Radius:</span>{' '}
                      {zone.radius_km} km
                    </div>
                  </>
                )}
                {zone.zone_type === 'corridor' && (
                  <>
                    <div>
                      <span className="font-medium">Start:</span>{' '}
                      {zone.lat1?.toFixed(4)}, {zone.lon1?.toFixed(4)}
                    </div>
                    <div>
                      <span className="font-medium">End:</span>{' '}
                      {zone.lat2?.toFixed(4)}, {zone.lon2?.toFixed(4)}
                    </div>
                    <div>
                      <span className="font-medium">Width:</span>{' '}
                      {zone.width_km} km
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
