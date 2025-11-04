import { Award, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function Legend() {
  return (
    <div className="mt-8 pt-4 border-t border-border">
      <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Legend</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-primary" />
          <span>Trophy winner</span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-600" />
          <span>Rank improved</span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-red-600" />
          <span>Rank dropped</span>
        </div>
        <div className="flex items-center gap-2">
          <Minus className="w-4 h-4 text-muted-foreground" />
          <span>No change</span>
        </div>
      </div>
    </div>
  );
}
