import Map from '@/components/Map';
import { TROPHIES_ON } from '@/lib/flags';

export default function Bronze() {
  if (!TROPHIES_ON) {
    return (
      <div className="p-4">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Bronze View</h2>
          <p className="text-muted-foreground">
            Trophy features are currently disabled. Set VITE_FEATURE_TROPHIES=true to enable.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Bronze Map View</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Tortuguero BioBlitz zones and observations
        </p>
      </div>

      <Map />

      <div className="text-xs text-muted-foreground">
        <p>🔵 Blue circles = Location zones</p>
        <p>🟠 Orange corridors = Beach zones</p>
      </div>
    </div>
  );
}
