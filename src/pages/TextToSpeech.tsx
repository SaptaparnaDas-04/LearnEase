import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Volume2, Play, Pause, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";

const TextToSpeech = () => {
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("en-US");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const languages = [
    { value: "en-US", label: "English" },
    { value: "hi-IN", label: "Hindi" },
    { value: "bn-IN", label: "Bengali" },
    { value: "ta-IN", label: "Tamil" },
    { value: "te-IN", label: "Telugu" },
    { value: "mr-IN", label: "Marathi" },
    { value: "gu-IN", label: "Gujarati" },
  ];

  const generateSpeech = async () => {
    if (!text.trim()) {
      toast({
        title: "Error",
        description: "Please enter text to convert",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      
      // Get available voices and select the best one for the language
      const voices = window.speechSynthesis.getVoices();
      const languageVoice = voices.find(voice => voice.lang.startsWith(language.split('-')[0]));
      if (languageVoice) {
        utterance.voice = languageVoice;
      }
      
      utterance.onend = () => {
        setIsPlaying(false);
        setIsGenerating(false);
      };

      utterance.onerror = () => {
        toast({
          title: "Error",
          description: "Failed to generate speech",
          variant: "destructive",
        });
        setIsGenerating(false);
      };

      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);

      toast({
        title: "Success",
        description: "Playing audio...",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate speech",
        variant: "destructive",
      });
      setIsGenerating(false);
    }
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      generateSpeech();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Volume2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Text to Speech</h1>
            <p className="text-xl text-muted-foreground">
              Convert any text to natural-sounding speech in multiple languages
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Enter Your Text</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Enter the text you want to convert to speech..."
                className="min-h-[200px] resize-none"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />

              <div className="flex items-center gap-4">
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  onClick={togglePlayPause}
                  disabled={isGenerating || !text.trim()}
                  className="flex-1"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : isPlaying ? (
                    <>
                      <Pause className="mr-2 h-4 w-4" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Generate & Play
                    </>
                  )}
                </Button>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Features:</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-primary" />
                    Natural-sounding voices
                  </li>
                  <li className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-primary" />
                    Multiple Indian languages supported
                  </li>
                  <li className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-primary" />
                    Perfect for accessibility needs
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TextToSpeech;
