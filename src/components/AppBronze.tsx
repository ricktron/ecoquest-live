import { useState } from 'react';
import Filters from '@/components/Filters';
import Map from '@/components/Map';
import Feed from '@/components/Feed';
import DevTools from '@/components/DevTools';

type ObsWithData = {
  inat_obs_id: number;
  user_login: string;
  latitude: number;
  longitude: number;
  quality_grade: string;
  taxon_name?: string;
  species_guess?: string;
  photo_url?: string;
  observedAt: string;
};

export default function AppBronze() {
  const [observations, setObservations] = useState<ObsWithData[]>([]);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b p-4 flex-shrink-0">
        <h1 className="text-xl font-bold">EcoQuest Live (Bronze)</h1>
        <div className="text-xs text-neutral-500">Real-time Observation Viewer</div>
      </header>

      {/* Filters */}
      <Filters />

      {/* Main Content - Map and Feed */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map */}
        <div className="flex-1 min-w-0">
          <Map onObsUpdate={setObservations} />
        </div>

        {/* Feed */}
        <div className="w-96 border-l bg-neutral-50 overflow-hidden">
          <Feed observations={observations} />
        </div>
      </div>

      {/* DevTools */}
      <DevTools observations={observations} />
    </div>
  );
}
