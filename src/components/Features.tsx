import { Card } from "@/components/ui/card";
import { Target, Users, Trophy, TrendingUp } from "lucide-react";

const features = [
  {
    icon: Target,
    title: "Daily Challenges",
    description:
      "Complete eco-friendly missions tailored to your lifestyle and make sustainability a habit.",
    color: "text-primary",
  },
  {
    icon: TrendingUp,
    title: "Track Your Impact",
    description:
      "Visualize your carbon footprint reduction and see the real-world difference you're making.",
    color: "text-accent",
  },
  {
    icon: Users,
    title: "Global Community",
    description:
      "Connect with like-minded individuals, share tips, and inspire each other to do more.",
    color: "text-secondary",
  },
  {
    icon: Trophy,
    title: "Earn Rewards",
    description:
      "Unlock achievements, climb leaderboards, and get recognized for your environmental efforts.",
    color: "text-primary-glow",
  },
];

export const Features = () => {
  return (
    <section className="py-24 px-4 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto">
        <div className="text-center space-y-4 mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            How EcoQuest Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Simple, engaging, and effective. Start making a difference today.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="p-6 space-y-4 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-card border-border/50 animate-in fade-in slide-in-from-bottom-8 duration-700"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center ${feature.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
