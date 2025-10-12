import { TrophyResults, RosterRow } from '@/types/trophies';

type TrophiesProps = {
  trophies: TrophyResults | null;
  roster: RosterRow[];
};

export default function Trophies({ trophies, roster }: TrophiesProps) {
  // Helper to get display name from roster
  const getDisplayName = (login: string) => {
    const user = roster.find(r => r.inat_login.toLowerCase() === login.toLowerCase());
    return user?.display_name_ui || login;
  };

  if (!trophies) {
    return (
      <div className="p-4 space-y-4">
        <h2 className="text-lg font-semibold">Trophies</h2>
        <div className="text-center text-gray-500 py-8">
          No trophies yet. Click "Fetch from iNaturalist" on the Admin tab to compute trophies.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-lg font-semibold">Trophies</h2>

      {/* Zone Trophies */}
      <div>
        <h3 className="font-semibold mb-3">Zone Trophies</h3>
        {trophies.zones.length === 0 ? (
          <div className="text-center text-gray-500 py-8">No zone trophies yet.</div>
        ) : (
          <div className="space-y-4">
            {trophies.zones.map((zone, i) => (
              <div key={i} className="border rounded-lg p-4 bg-white">
                <h4 className="font-medium mb-3">{zone.label}</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Student Winner:</span>
                    {zone.student ? (
                      <span className="font-medium">
                        {getDisplayName(zone.student.user)} ({zone.student.count})
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Overall Winner:</span>
                    {zone.overall ? (
                      <span className="font-medium">
                        {getDisplayName(zone.overall.user)} ({zone.overall.count})
                        {zone.overall.is_adult && (
                          <span className="ml-2 text-sm text-blue-600">✓ Exhibition</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Species Trophies */}
      <div>
        <h3 className="font-semibold mb-3">Species Trophies</h3>
        <div className="border rounded-lg p-4 bg-white">
          <h4 className="font-medium mb-3">Most Turtles</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Student Winner:</span>
              {trophies.turtles.student ? (
                <span className="font-medium">
                  {getDisplayName(trophies.turtles.student.user)} ({trophies.turtles.student.count})
                </span>
              ) : (
                <span className="text-gray-400">-</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Overall Winner:</span>
              {trophies.turtles.overall ? (
                <span className="font-medium">
                  {getDisplayName(trophies.turtles.overall.user)} ({trophies.turtles.overall.count})
                  {trophies.turtles.overall.is_adult && (
                    <span className="ml-2 text-sm text-blue-600">✓ Exhibition</span>
                  )}
                </span>
              ) : (
                <span className="text-gray-400">-</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
