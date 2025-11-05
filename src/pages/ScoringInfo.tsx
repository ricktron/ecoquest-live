import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

export default function ScoringInfo() {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div className="pb-6">
      <div className="max-w-3xl mx-auto px-3 md:px-6 py-6 space-y-6">
        <h1 className="text-3xl font-bold">How Scoring Works</h1>
        <div className="p-4 bg-primary/10 border-l-4 border-primary rounded mb-4">
          <p className="font-semibold text-foreground">⏰ Important: Scores use observation TAKEN time, not upload time!</p>
          <p className="text-sm text-muted-foreground mt-1">
            The time you photograph matters for daily trophies and diminishing returns.
          </p>
        </div>
        <p className="text-muted-foreground">
          EcoQuest Live rewards careful observation, species diversity, and timeliness.
        </p>

        <Card>
          <CardHeader>
            <CardTitle>Base Scoring</CardTitle>
            <CardDescription>Every observation starts here</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-medium">Base observation</span>
              <span className="text-lg">1.0 pts</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-medium">Research grade bonus</span>
              <span className="text-lg">+1.0 pts</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-medium">Needs ID bonus</span>
              <span className="text-lg">+0.5 pts</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Novelty Bonuses</CardTitle>
            <CardDescription>Rewards for being first</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <div>
                <div className="font-medium">Trip First</div>
                <div className="text-sm text-muted-foreground">First to observe a species during the trip</div>
              </div>
              <span className="text-lg">+3.0 pts</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <div>
                <div className="font-medium">Day First</div>
                <div className="text-sm text-muted-foreground">First to observe a species that day</div>
              </div>
              <span className="text-lg">+1.5 pts</span>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">Early Observer</div>
                <div className="text-sm text-muted-foreground">2nd or 3rd person to observe</div>
              </div>
              <span className="text-lg">+0.75-2.0 pts</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Diminishing Returns</CardTitle>
            <CardDescription>Encourages diverse observations</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Multiple observations of the same species on the same day receive reduced points (ordered by photo time):
            </p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span>1st observer</span>
                <span className="font-mono">100%</span>
              </div>
              <div className="flex justify-between items-center">
                <span>2nd observer</span>
                <span className="font-mono">75%</span>
              </div>
              <div className="flex justify-between items-center">
                <span>3rd observer</span>
                <span className="font-mono">55%</span>
              </div>
              <div className="flex justify-between items-center">
                <span>4th observer</span>
                <span className="font-mono">40%</span>
              </div>
              <div className="flex justify-between items-center">
                <span>5th observer</span>
                <span className="font-mono">30%</span>
              </div>
              <div className="flex justify-between items-center">
                <span>6th observer</span>
                <span className="font-mono">20%</span>
              </div>
              <div className="flex justify-between items-center">
                <span>7th+ observer</span>
                <span className="font-mono">15%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Special Multipliers</CardTitle>
            <CardDescription>Additional scoring factors</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="font-medium mb-1">Rarity Bonus</div>
              <p className="text-sm text-muted-foreground mb-2">
                Based on how rarely the species is observed in the trip
              </p>
              <div className="text-sm">0 to +3.0 pts</div>
            </div>
            <div>
              <div className="font-medium mb-1">Daily Fatigue</div>
              <p className="text-sm text-muted-foreground mb-2">
                Soft cap prevents point inflation from mass uploads
              </p>
              <div className="text-sm space-y-1">
                <div>≤20 obs/day: 100%</div>
                <div>21-50 obs/day: 60%</div>
                <div>51+ obs/day: 30%</div>
              </div>
            </div>
            <div>
              <div className="font-medium mb-1">Rubber Band</div>
              <p className="text-sm text-muted-foreground mb-2">
                Trailing participants get a small boost to stay competitive
              </p>
              <div className="text-sm space-y-1">
                <div>Bottom 30%: +20%</div>
                <div>30-60%: +10%</div>
                <div>Top 40%: No boost</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 text-primary hover:underline">
            <ChevronDown className={`w-4 h-4 transition-transform ${detailsOpen ? 'rotate-180' : ''}`} />
            See full formula details
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Complete Formula</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted p-4 rounded overflow-x-auto">
{`points = (
  base (1.0)
  + noveltyTrip (0, 1, 2, or 3)
  + noveltyDay (0.3, 0.75, or 1.5)
  + rarity (0 to 3.0)
  + researchBonus (0, 0.5, or 1.0)
) × firstNFactor (0.15 to 1.0)
  × fatigue (0.3, 0.6, or 1.0)
  × rubberBand (1.0, 1.1, or 1.2)

Where:
- noveltyTrip: 3 if trip-first, 2 if early, 1 otherwise
- noveltyDay: 1.5 if day-first, 0.75 if early, 0.3 otherwise
- rarity: based on observation frequency (capped at 3.0)
- researchBonus: 1.0 for research grade, 0.5 for needs ID
- firstNFactor: diminishing returns (1.0, 0.75, 0.55, 0.40, 0.30, 0.20, 0.15)
- fatigue: based on daily observation count
- rubberBand: percentile-based boost for trailing users

Final score is rounded to 2 decimal places.
Ties are broken by: unique species count, then earliest observation time.`}
                </pre>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
