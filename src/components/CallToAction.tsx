import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export const CallToAction = () => {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10" />
      
      <div className="container mx-auto relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-in fade-in zoom-in-95 duration-700">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 backdrop-blur-sm">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>

          {/* Headline */}
          <h2 className="text-4xl md:text-6xl font-bold text-foreground leading-tight">
            Ready to Make a{" "}
            <span className="bg-gradient-to-r from-primary via-accent to-primary-glow bg-clip-text text-transparent">
              Real Difference?
            </span>
          </h2>

          {/* Description */}
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Join thousands of eco-warriors transforming the planet one action at
            a time. Your journey towards a sustainable future starts now.
          </p>

          {/* CTA Button */}
          <div className="pt-4">
            <Button
              size="lg"
              className="text-lg px-12 py-7 bg-gradient-to-r from-primary to-primary-glow hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              Begin Your EcoQuest
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-8 pt-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span>100% Free to Join</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span>No Credit Card Required</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              <span>Start Immediately</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
