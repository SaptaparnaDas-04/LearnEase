import { Card, CardContent } from "@/components/ui/card";
import { Users, GraduationCap, Network, TrendingUp } from "lucide-react";

const impacts = [
  {
    icon: Users,
    title: "Empowering Students",
    description: "Breaking down complex procedures into simple, accessible steps for all learners, especially those in rural areas and with disabilities.",
    stats: "Accessible to All",
  },
  {
    icon: GraduationCap,
    title: "Digital & Academic Literacy",
    description: "Building long-term familiarity with digital tools through gamified tutorials, quizzes, and multilingual explanations.",
    stats: "Future-Ready Skills",
  },
  {
    icon: Network,
    title: "Bridging Institutional Gaps",
    description: "Connecting schools, NGOs, and education boards to deliver verified, up-to-date content and reduce misinformation.",
    stats: "Trusted Network",
  },
  {
    icon: TrendingUp,
    title: "Scalability & Sustainability",
    description: "AI-driven architecture with continuous improvement through feedback, adaptable to multiple regions and languages.",
    stats: "Long-term Impact",
  },
];

const Impact = () => {
  return (
    <section id="impact" className="py-20 bg-muted/30 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.1),transparent_50%)]" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="text-4xl lg:text-5xl font-bold mb-4">
            Making a <span className="gradient-text">Real Difference</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Empowering students with accessible, AI-driven educational support
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {impacts.map((impact, index) => (
            <Card
              key={index}
              className="card-hover border-none shadow-lg overflow-hidden group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-8">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <impact.icon className="w-7 h-7 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xl font-semibold">{impact.title}</h3>
                      <span className="text-xs font-semibold px-3 py-1 bg-primary/10 text-primary rounded-full">
                        {impact.stats}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{impact.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-3 gap-6 animate-fade-in">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-6 text-center">
              <div className="text-4xl font-bold text-primary mb-2">Low Cost</div>
              <p className="text-sm text-muted-foreground">
                Affordable deployment in under-resourced areas
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
            <CardContent className="p-6 text-center">
              <div className="text-4xl font-bold text-secondary mb-2">Scalable</div>
              <p className="text-sm text-muted-foreground">
                Expandable to multiple regions and languages
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
            <CardContent className="p-6 text-center">
              <div className="text-4xl font-bold text-accent mb-2">Integrated</div>
              <p className="text-sm text-muted-foreground">
                Seamlessly connects with government portals
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Impact;
