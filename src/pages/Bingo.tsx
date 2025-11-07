import { useState, useEffect } from 'react';
import { fetchBingo, fetchUserLogins } from '../lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  const [userLogins, setUserLogins] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [cells, setCells] = useState<BingoCell[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCell, setSelectedCell] = useState<string | null>(null);

  const getCellInfo = (label: string): CellInfo => {
    return CELL_INFO[label] || {
      emoji: '❓',
      short: label,
      description: 'Challenge cell',
      howToEarn: 'Complete the associated challenge to unlock this cell'
    };
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const logins = await fetchUserLogins();
      if (!mounted) return;
      setUserLogins(logins);
      if (logins.length > 0) setSelectedUser(logins[0]);
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!selectedUser) return;
    let mounted = true;
    setLoading(true);
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
      <h1 className="text-2xl font-bold mb-4">Bingo</h1>
      
      <div className="mb-6">
        <label htmlFor="user-select" className="block text-sm font-medium mb-2">
          Select User
        </label>
        <select
          id="user-select"
          className="w-full p-2 border rounded-lg"
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
        >
          {userLogins.map((login) => (
            <option key={login} value={login}>
              {login}
            </option>
          ))}
        </select>
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
        </>
      )}
    </div>
  );
}
