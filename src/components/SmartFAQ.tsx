import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, Search, Loader2, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  views: number;
}

const SmartFAQ = () => {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [question, setQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadFAQs();
  }, []);

  const loadFAQs = async () => {
    const { data, error } = await supabase
      .from('faqs')
      .select('*')
      .order('views', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error loading FAQs:', error);
    } else if (data) {
      setFaqs(data);
    }
  };

  const askAI = async () => {
    if (!question.trim()) {
      toast({
        title: "Please enter a question",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setAiAnswer("");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/answer-faq`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ question }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get answer');
      }

      const data = await response.json();
      setAiAnswer(data.answer);
    } catch (error) {
      console.error('FAQ error:', error);
      toast({
        title: "Error",
        description: "Failed to get answer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateViews = async (faqId: string) => {
    await supabase
      .from('faqs')
      .update({ views: faqs.find(f => f.id === faqId)!.views + 1 })
      .eq('id', faqId);
  };

  const filteredFaqs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = [...new Set(faqs.map(f => f.category).filter(Boolean))];

  return (
    <section id="faq" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            <span className="gradient-text">Smart FAQ</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get instant answers powered by AI or browse common questions
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* AI Question Box */}
          <Card className="border-primary/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Ask AI Anything
              </CardTitle>
              <CardDescription>
                Type your question in natural language and get instant AI-powered answers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="E.g., What documents do I need for scholarship application?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && askAI()}
                  className="flex-1"
                />
                <Button onClick={askAI} disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {aiAnswer && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <HelpCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div className="space-y-2">
                        <p className="font-medium text-sm text-muted-foreground">AI Answer:</p>
                        <p className="text-sm leading-relaxed">{aiAnswer}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          {/* Search FAQs */}
          <div>
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search frequently asked questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Tabs */}
            {categories.length > 0 && (
              <div className="flex gap-2 mb-6 flex-wrap">
                <Button
                  variant={searchTerm === "" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSearchTerm("")}
                >
                  All
                </Button>
                {categories.map(category => (
                  <Button
                    key={category}
                    variant={searchTerm === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSearchTerm(category || "")}
                  >
                    {category}
                  </Button>
                ))}
              </div>
            )}

            {/* FAQ Accordion */}
            <Accordion type="single" collapsible className="space-y-4">
              {filteredFaqs.map((faq, index) => (
                <AccordionItem
                  key={faq.id}
                  value={`item-${index}`}
                  className="border rounded-lg px-4 bg-card"
                >
                  <AccordionTrigger
                    onClick={() => updateViews(faq.id)}
                    className="hover:no-underline"
                  >
                    <div className="flex items-start gap-3 text-left">
                      <HelpCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="font-medium">{faq.question}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pl-8 text-muted-foreground">
                    {faq.answer}
                    {faq.category && (
                      <div className="mt-3 inline-block">
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                          {faq.category}
                        </span>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {filteredFaqs.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <HelpCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No FAQs found. Try asking the AI above!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SmartFAQ;
