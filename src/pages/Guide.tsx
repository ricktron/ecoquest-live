import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, Award, TrendingUp, Shield, Clock, Eye } from 'lucide-react';

export default function Guide() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="pb-6">
      <div className="max-w-3xl mx-auto px-3 md:px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">EcoQuest Field Guide</h1>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print Guide
          </Button>
        </div>

        <p className="text-muted-foreground">Quick reference for scoring, trophies, and safety in the field.</p>

        {/* Scoring */}
        <Card id="scoring">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Scoring Basics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>• Base observation: <strong>1.0 pts</strong></p>
            <p>• Research Grade bonus: <strong>+0.30 pts</strong> (capped daily/trip)</p>
            <p>• Casual penalty: <strong>-0.10 pts</strong> (capped)</p>
            <p>• First to find a species: <strong>+3.0 pts</strong></p>
            <p>• Scores use <strong>photo taken time</strong>, not upload time</p>
          </CardContent>
        </Card>

        {/* Quality Grades */}
        <Card id="grades">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Quality Grades
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>• <strong>Research Grade:</strong> Species-level ID with community agreement</p>
            <p>• <strong>Needs ID:</strong> Partially identified, awaiting input</p>
            <p>• <strong>Casual:</strong> Cannot be identified further (captive/cultivated)</p>
          </CardContent>
        </Card>

        {/* Trophies */}
        <Card id="trophies">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              Trophy Types
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>• <strong>Early Bird:</strong> Most observations 04:00–07:00</p>
            <p>• <strong>Night Owl:</strong> Most observations sunset–midnight</p>
            <p>• <strong>Variety Hero:</strong> Most unique species</p>
            <p>• <strong>First Finder:</strong> Most first-to-trip species</p>
            <p>• <strong>Peer-Reviewed Pro:</strong> Most research-grade observations</p>
            <p className="text-muted-foreground italic">Trophies can change hands during the trip!</p>
          </CardContent>
        </Card>

        {/* Rarity */}
        <Card id="rarity">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Rarity Scoring
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>• Combines group frequency (70%) and local baseline (30%)</p>
            <p>• Rare finds earn bonus points and special recognition</p>
            <p>• "Wanted" posters show locally rare species to seek</p>
          </CardContent>
        </Card>

        {/* Time */}
        <Card id="time">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Time Windows
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>• <strong>Early Bird:</strong> 04:00–07:00 local time</p>
            <p>• <strong>Night Owl:</strong> Sunset–23:59 (fallback 17:30–23:59)</p>
            <p>• <strong>Steady Eddie:</strong> Spread observations across ≥4 distinct hours</p>
          </CardContent>
        </Card>

        {/* Privacy */}
        <Card id="privacy">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Privacy & Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>• All observations are public via iNaturalist</p>
            <p>• Sensitive species locations may be obscured</p>
            <p>• Trip data is read-only; no account needed to view</p>
          </CardContent>
        </Card>

        {/* Safety */}
        <Card id="safety">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-500" />
              Field Safety
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>• Never handle wildlife without instructor guidance</p>
            <p>• Check for hazard taxa (plants, insects) before touching</p>
            <p>• Stay hydrated and use sun protection</p>
            <p>• Travel in groups; inform others of your location</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
