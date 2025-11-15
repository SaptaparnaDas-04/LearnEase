import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart, Upload, Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";

interface Assessment {
  score: number;
  strengths: string[];
  improvements: string[];
  feedback: string;
}

const AssessWork = () => {
  const [assignment, setAssignment] = useState("");
  const [rubric, setRubric] = useState("");
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const assessWork = async () => {
    if (!assignment.trim()) {
      toast({
        title: "Error",
        description: "Please paste your assignment",
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
              content: `Assess this student assignment and provide detailed feedback in JSON format: {"score": 0-100, "strengths": ["point1", "point2"], "improvements": ["point1", "point2"], "feedback": "detailed feedback"}.\n\n${rubric ? `Rubric: ${rubric}\n\n` : ""}Assignment:\n${assignment}`,
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
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const assessmentData = JSON.parse(jsonMatch[0]);
        setAssessment(assessmentData);
        toast({
          title: "Success",
          description: "Assessment completed!",
        });
      } else {
        throw new Error("Could not parse assessment");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to assess work",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary/10 mb-4">
              <BarChart className="w-8 h-8 text-secondary" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Assess Your Work</h1>
            <p className="text-xl text-muted-foreground">
              Get instant AI-powered feedback on your assignments and essays
            </p>
          </div>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Submit Your Work</CardTitle>
                <CardDescription>
                  Paste your assignment below and optionally include a rubric for more targeted feedback
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="assignment">Your Assignment</Label>
                  <Textarea
                    id="assignment"
                    placeholder="Paste your essay, assignment, or any written work here..."
                    className="min-h-[200px] resize-none"
                    value={assignment}
                    onChange={(e) => setAssignment(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="rubric">Rubric (Optional)</Label>
                  <Textarea
                    id="rubric"
                    placeholder="Include grading criteria or rubric for more specific feedback..."
                    className="min-h-[100px] resize-none"
                    value={rubric}
                    onChange={(e) => setRubric(e.target.value)}
                  />
                </div>

                <Button onClick={assessWork} disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Assessing...
                    </>
                  ) : (
                    <>
                      <BarChart className="mr-2 h-4 w-4" />
                      Assess My Work
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {assessment && (
              <Card className="border-primary">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Assessment Results
                    <div className="text-4xl font-bold text-primary">
                      {assessment.score}%
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      Strengths
                    </h3>
                    <ul className="space-y-2">
                      {assessment.strengths.map((strength, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2" />
                          <span className="text-muted-foreground">{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-500" />
                      Areas for Improvement
                    </h3>
                    <ul className="space-y-2">
                      {assessment.improvements.map((improvement, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2" />
                          <span className="text-muted-foreground">{improvement}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Detailed Feedback</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {assessment.feedback}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssessWork;
