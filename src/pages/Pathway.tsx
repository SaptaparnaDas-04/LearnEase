import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Route, CheckCircle2, Circle, Calendar, FileText, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Loader2 } from "lucide-react";

interface PathwayStep {
  title: string;
  description: string;
  deadline: string;
  documents: string[];
  completed: boolean;
}

const Pathway = () => {
  const [goal, setGoal] = useState("");
  const [pathway, setPathway] = useState<PathwayStep[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const generatePathway = async () => {
    if (!goal.trim()) {
      toast({
        title: "Error",
        description: "Please enter your goal",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("chat", {
        body: {
          messages: [
            {
              role: "user",
              content: `Create a detailed step-by-step pathway for: "${goal}". Format the response as JSON with this structure: [{"title": "Step title", "description": "Step description", "deadline": "Estimated timeline", "documents": ["Doc1", "Doc2"], "completed": false}]. Provide 5-7 practical steps with realistic timelines and required documents.`,
            },
          ],
        },
      });

      if (error) throw error;

      const reader = data.getReader();
      const decoder = new TextDecoder();
      let result = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6);
            if (jsonStr === "[DONE]") continue;

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                result += content;
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
        }
      }

      // Extract JSON from response
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const steps = JSON.parse(jsonMatch[0]);
        setPathway(steps);
        toast({
          title: "Success",
          description: "Pathway generated successfully!",
        });
      } else {
        throw new Error("Could not parse pathway");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate pathway",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStep = (index: number) => {
    setPathway((prev) =>
      prev.map((step, i) =>
        i === index ? { ...step, completed: !step.completed } : step
      )
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Route className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Guided Pathways</h1>
            <p className="text-xl text-muted-foreground">
              Get personalized roadmaps for scholarships and exams
            </p>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Create Your Pathway</CardTitle>
              <CardDescription>
                Tell us your goal and we'll create a personalized step-by-step plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="goal">Your Goal</Label>
                  <Input
                    id="goal"
                    placeholder="e.g., Apply for National Merit Scholarship, Prepare for JEE Main..."
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                  />
                </div>
                <Button onClick={generatePathway} disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Pathway...
                    </>
                  ) : (
                    "Generate Pathway"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {pathway.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Your Personalized Pathway</h2>
              {pathway.map((step, index) => (
                <Card
                  key={index}
                  className={`cursor-pointer transition-all ${
                    step.completed ? "bg-primary/5 border-primary" : ""
                  }`}
                  onClick={() => toggleStep(index)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="mt-1">
                        {step.completed ? (
                          <CheckCircle2 className="w-6 h-6 text-primary" />
                        ) : (
                          <Circle className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <h3 className="text-lg font-semibold">
                            Step {index + 1}: {step.title}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            {step.deadline}
                          </div>
                        </div>
                        <p className="text-muted-foreground mb-4">{step.description}</p>
                        {step.documents.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <FileText className="w-4 h-4" />
                              Required Documents:
                            </div>
                            <ul className="ml-6 space-y-1">
                              {step.documents.map((doc, docIndex) => (
                                <li key={docIndex} className="text-sm text-muted-foreground flex items-center gap-2">
                                  <AlertCircle className="w-3 h-3" />
                                  {doc}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Pathway;
