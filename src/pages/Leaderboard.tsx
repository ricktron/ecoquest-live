import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { listAssignments, getLeaderboard } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Medal, TrendingUp } from 'lucide-react';

export default function Leaderboard() {
  const [selectedAssignment, setSelectedAssignment] = useState<string>('');

  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['assignments'],
    queryFn: listAssignments,
  });

  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery({
    queryKey: ['leaderboard', selectedAssignment],
    queryFn: () => getLeaderboard(selectedAssignment),
    enabled: !!selectedAssignment,
  });

  // Auto-select first assignment
  if (assignments && assignments.length > 0 && !selectedAssignment) {
    setSelectedAssignment(assignments[0].id);
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-secondary" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-muted-foreground" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-accent" />;
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Assignment Selector */}
      <Card className="p-4">
        <label className="block text-sm font-medium text-foreground mb-2">
          Select Assignment
        </label>
        <Select value={selectedAssignment} onValueChange={setSelectedAssignment}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose an assignment..." />
          </SelectTrigger>
          <SelectContent>
            {assignments?.map((assignment) => (
              <SelectItem key={assignment.id} value={assignment.id}>
                {assignment.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {/* Leaderboard Table */}
      {selectedAssignment && (
        <Card className="overflow-hidden">
          <div className="bg-primary/5 px-6 py-4 border-b border-border">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Current Rankings
            </h2>
          </div>

          {leaderboardLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading leaderboard...
            </div>
          ) : !leaderboard || leaderboard.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No leaderboard data available yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Points
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {leaderboard.map((entry: any, index: number) => (
                    <tr
                      key={entry.student_id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getRankIcon(index + 1)}
                          <span className="text-sm font-medium text-foreground">
                            #{index + 1}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-foreground">
                          {entry.public_handle || 'Anonymous'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-semibold text-primary">
                          {entry.points?.toLocaleString() || 0}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
