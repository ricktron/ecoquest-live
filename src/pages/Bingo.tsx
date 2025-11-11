import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchBingo, fetchLeaderboardCR2025, fetchRosterCR2025, type TripRosterEntry } from '../lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { HelpCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type BingoCell = {
  label: string;
  hit: boolean;
};

type CellInfo = {
  emoji: string;
  short: string;
  description: string;
  howToEarn: string;
};

type ParticipantOption = {
  login: string;
  label: string;
};

const CELL_INFO: Record<string, CellInfo> = {
  'early_bird': {
    emoji: '🌅',
    short: 'Early Bird',
    description: 'Record observations before sunrise',
    howToEarn: 'Submit observations during the early morning hours (before 6 AM local time)'
  },
  'night_owl': {
    emoji: '🦉',
    short: 'Night Owl',
    description: 'Record observations after sunset',
    howToEarn: 'Submit observations during nighttime hours (after 6 PM local time)'
  },
  'streak_3': {
    emoji: '🔥',
    short: '3-Day Streak',
    description: 'Observe for 3 consecutive days',
    howToEarn: 'Record observations on at least 3 consecutive days'
  },
  'streak_7': {
    emoji: '⚡',
    short: '7-Day Streak',
    description: 'Observe for 7 consecutive days',
    howToEarn: 'Record observations on at least 7 consecutive days'
  },
  'taxa_10': {
    emoji: '🌿',
    short: '10 Taxa',
    description: 'Record 10 different species',
    howToEarn: 'Observe and document at least 10 distinct taxa (species)'
  },
  'taxa_25': {
    emoji: '🌳',
    short: '25 Taxa',
    description: 'Record 25 different species',
    howToEarn: 'Observe and document at least 25 distinct taxa (species)'
  },
  'rare_find': {
    emoji: '💎',
    short: 'Rare Find',
    description: 'Spot a rare species',
    howToEarn: 'Record an observation of a species with high rarity value'
  },
  'photo_quality': {
    emoji: '📸',
    short: 'Quality Photos',
    description: 'Submit high-quality photos',
    howToEarn: 'Upload clear, well-lit photos with good composition'
  },
  'community': {
    emoji: '👥',
    short: 'Community',
    description: 'Help identify others\' observations',
    howToEarn: 'Provide identifications for other users\' observations'
  },
  'explorer': {
    emoji: '🗺️',
    short: 'Explorer',
    description: 'Visit multiple locations',
    howToEarn: 'Record observations from at least 5 different locations'
  },
  'specialist': {
    emoji: '🔬',
    short: 'Specialist',
    description: 'Focus on one taxonomic group',
    howToEarn: 'Record 10+ observations of the same taxonomic family'
  },
  'generalist': {
    emoji: '🎯',
    short: 'Generalist',
    description: 'Record diverse observations',
    howToEarn: 'Record observations across at least 5 different taxonomic families'
  },
  'daily_10': {
    emoji: '📊',
    short: '10 in a Day',
    description: 'Record 10 observations in one day',
    howToEarn: 'Submit at least 10 observations on a single calendar day'
  },
  'weekend_warrior': {
    emoji: '🎉',
    short: 'Weekend Warrior',
    description: 'Active on weekends',
    howToEarn: 'Record observations on both Saturday and Sunday'
  },
  'weather_all': {
    emoji: '🌦️',
    short: 'All Weather',
    description: 'Observe in various conditions',
    howToEarn: 'Record observations in different weather conditions (sunny, cloudy, rainy)'
  },
};

export default function Bingo() {
  const [participants, setParticipants] = useState<ParticipantOption[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [defaultUser, setDefaultUser] = useState<string>('');
  const [cells, setCells] = useState<BingoCell[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const paramLogin = useMemo(() => searchParams.get('u'), [searchParams]);

  const getCellInfo = (label: string): CellInfo => {
    return CELL_INFO[label] || {
      emoji: '❓',
      short: label,
      description: 'Challenge cell',
      howToEarn: 'Complete the associated challenge to unlock this cell'
    };
  };

  const handleUserChange = (value: string) => {
    setSelectedUser(value);
    const params = new URLSearchParams(searchParams);
    if (!value) {
      params.delete('u');
    } else {
      params.set('u', value);
    }
    setSearchParams(params, { replace: true });
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      setParticipantsLoading(true);
      try {
        const [rosterResult, leaderboardResult] = await Promise.all([
          fetchRosterCR2025(),
          fetchLeaderboardCR2025(),
        ]);

        if (!mounted) return;

        const options = (rosterResult.data ?? [])
          .map((row: TripRosterEntry) => ({
            login: row.user_login,
            label: row.display_name || row.user_login,
          }))
          .sort((a, b) => a.label.localeCompare(b.label));
        setParticipants(options);

        const leaderboardRows = leaderboardResult.data?.rows ?? [];
        const observedSet = new Set(
          leaderboardRows
            .filter((row) => row.obs_count > 0)
            .map((row) => row.user_login.toLowerCase()),
        );
        const fallbackLogin = options[0]?.login ?? '';
        const firstObserved = options.find((option) => observedSet.has(option.login.toLowerCase()))?.login ?? fallbackLogin;
        setDefaultUser(firstObserved);
      } finally {
        if (mounted) {
          setParticipantsLoading(false);
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (participants.length === 0) return;
    const normalizedParam = (paramLogin ?? '').toLowerCase();
    const matched = participants.find((p) => p.login.toLowerCase() === normalizedParam);
    if (matched) {
      setSelectedUser((prev) => (prev === matched.login ? prev : matched.login));
      return;
    }

    if (!defaultUser) return;

    setSelectedUser((prev) => (prev === defaultUser ? prev : defaultUser));
    const params = new URLSearchParams(searchParams);
    params.set('u', defaultUser);
    setSearchParams(params, { replace: true });
  }, [participants, paramLogin, defaultUser, searchParams, setSearchParams]);

  useEffect(() => {
    if (!selectedUser) return;
    let mounted = true;
    setLoading(true);
    setSelectedCell(null);
    (async () => {
      const data = await fetchBingo(selectedUser);
      if (!mounted) return;
      setCells(data);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [selectedUser]);

  return (
    <div className="page">
      <div className="flex flex-col gap-3 mb-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Field Bingo</h1>
          <button
            onClick={() => setShowHelp(true)}
            className="p-1 rounded-full hover:bg-muted transition-colors"
            aria-label="Show bingo rules"
          >
            <HelpCircle className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        <div className="w-full md:w-64">
          <Select
            value={selectedUser}
            onValueChange={handleUserChange}
            disabled={participantsLoading || participants.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={participantsLoading ? 'Loading participants…' : 'Select participant'} />
            </SelectTrigger>
            <SelectContent>
              {participants.map((participant) => (
                <SelectItem key={participant.login} value={participant.login}>
                  {participant.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading bingo board...</div>
      ) : cells.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No bingo data available</div>
      ) : (
        <>
          <div className="bingo">
            <div className="bingo__grid">
              {cells.map((cell, i) => {
                const info = getCellInfo(cell.label);
                return (
                  <div
                    key={i}
                    className={`bingo__cell ${cell.hit ? 'hit' : ''}`}
                    onClick={() => setSelectedCell(cell.label)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setSelectedCell(cell.label);
                      }
                    }}
                  >
                    <span className="bingo__emoji">{info.emoji}</span>
                    <span className="bingo__short">{info.short}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <Dialog open={!!selectedCell} onOpenChange={() => setSelectedCell(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-2xl">
                  <span>{selectedCell ? getCellInfo(selectedCell).emoji : ''}</span>
                  <span>{selectedCell ? getCellInfo(selectedCell).short : ''}</span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-1">Description</h4>
                  <p>{selectedCell ? getCellInfo(selectedCell).description : ''}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-1">How to Earn</h4>
                  <p>{selectedCell ? getCellInfo(selectedCell).howToEarn : ''}</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showHelp} onOpenChange={setShowHelp}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span>🎯</span>
                  <span>How Bingo Works</span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Scoring Rules</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span><strong>Hit a square:</strong> Earn 1 point</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span><strong>Complete a line:</strong> Get +5 bonus points (horizontal, vertical, or diagonal)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span><strong>Blackout (all 25):</strong> Get +20 bonus points</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">How to Play</h4>
                  <p className="text-sm text-muted-foreground">
                    Complete challenges by recording observations on iNaturalist.
                    Tap any square to see what's required to earn it.
                    Bingo points are used as tie-breakers on the leaderboard.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Bingo isn’t scored; it’s a challenge checklist.
      </p>
    </div>
  );
}
