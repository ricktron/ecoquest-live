import { useState, useMemo, useEffect } from 'react';
import { useAppState } from '@/lib/state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function Compare() {
  const { loading, aggregated, initialize } = useAppState();
  const [userA, setUserA] = useState<string>('');
  const [userB, setUserB] = useState<string>('');

  useEffect(() => {
    initialize();
  }, []);

  const users = useMemo(() => {
    if (!aggregated) return [];
    return Array.from(aggregated.byUser.keys()).sort();
  }, [aggregated]);

  const comparison = useMemo(() => {
    if (!aggregated || !userA || !userB) return null;

    const a = aggregated.byUser.get(userA);
    const b = aggregated.byUser.get(userB);
    if (!a || !b) return null;

    const pointsDelta = a.points - b.points;
    const sharedSpecies = a.speciesCount && b.speciesCount ? Math.min(a.speciesCount, b.speciesCount) : 0;
    const uniqueA = a.speciesCount - sharedSpecies;
    const uniqueB = b.speciesCount - sharedSpecies;

    return {
      a,
      b,
      pointsDelta,
      sharedSpecies,
      uniqueA,
      uniqueB,
    };
  }, [aggregated, userA, userB]);

  if (loading) {
    return (
      <div className="pb-6">
        <div className="max-w-3xl mx-auto px-3 md:px-6 py-6">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <div className="max-w-3xl mx-auto px-3 md:px-6 py-6 space-y-6">
        <h1 className="text-3xl font-bold">Compare Users</h1>

        {/* User Selectors */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">User A</label>
            <Select value={userA} onValueChange={setUserA}>
              <SelectTrigger>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {users.map(u => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">User B</label>
            <Select value={userB} onValueChange={setUserB}>
              <SelectTrigger>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {users.map(u => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Comparison Results */}
        {comparison && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Points Delta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {comparison.pointsDelta > 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : comparison.pointsDelta < 0 ? (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  ) : (
                    <Minus className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className="text-2xl font-bold">
                    {Math.abs(comparison.pointsDelta).toFixed(1)} pts
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {comparison.pointsDelta > 0 ? `${userA} ahead` : comparison.pointsDelta < 0 ? `${userB} ahead` : 'Tied'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Species Overlap</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Shared</span>
                  <Badge variant="secondary">{comparison.sharedSpecies}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Unique to {userA}</span>
                  <Badge variant="outline">{comparison.uniqueA}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Unique to {userB}</span>
                  <Badge variant="outline">{comparison.uniqueB}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Observations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{userA}</span>
                    <span className="font-mono">{comparison.a.obsCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{userB}</span>
                    <span className="font-mono">{comparison.b.obsCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {!comparison && (userA || userB) && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Select both users to compare
          </p>
        )}
      </div>
    </div>
  );
}
