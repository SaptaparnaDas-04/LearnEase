import React, { useState, useCallback, ChangeEvent } from "react";
import { Languages, ArrowRight, Loader2, X } from "lucide-react";

// --- TYPE DEFINITIONS ---
interface Language {
  value: string;
  label: string;
}

interface ToastMessage {
  title: string;
  description: string;
  variant: "default" | "destructive";
}

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

interface TextareaProps {
  placeholder?: string;
  className?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
}

// --- START MOCK COMPONENTS & UTILITIES ---

// Mock for Shadcn/ui components (simplified for single-file environment)
const Button: React.FC<ButtonProps> = ({ children, onClick, disabled, className = "" }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 font-semibold text-sm rounded-lg shadow-md transition-colors ${
      disabled
        ? "bg-gray-400 text-gray-700 cursor-not-allowed"
        : "bg-blue-600 hover:bg-blue-700 text-white"
    } ${className}`}
  >
    {children}
  </button>
);

const Textarea: React.FC<TextareaProps> = ({ placeholder, className, value, onChange }) => (
  <textarea
    placeholder={placeholder}
    className={`w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-y ${className}`}
    value={value}
    onChange={onChange}
    rows={10}
  />
);

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-lg border border-gray-100 ${className}`}>
    {children}
  </div>
);
const CardHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => <div className="p-5 border-b">{children}</div>;
const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <h2 className={`text-lg font-bold text-gray-800 ${className}`}>{children}</h2>
);
const CardContent: React.FC<{ children: React.ReactNode }> = ({ children }) => <div className="p-5">{children}</div>;

// Mock Select components (simplified)
const Select: React.FC<{ value: string; onValueChange: (value: string) => void; children: React.ReactNode }> = ({ value, onValueChange, children }) => {
    const handleSelectChange = (e: ChangeEvent<HTMLSelectElement>) => onValueChange(e.target.value);
    return (
        <select
            value={value}
            onChange={handleSelectChange}
            className="w-full p-2 border border-gray-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
            {children}
        </select>
    );
};
const SelectTrigger: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
const SelectValue: React.FC<{ placeholder: string }> = ({ placeholder }) => <>{placeholder}</>;
const SelectContent: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
const SelectItem: React.FC<{ value: string; children: React.ReactNode }> = ({ value, children }) => <option value={value}>{children}</option>;

// Placeholder for useToast
const useToast = () => {
  const [toastMessage, setToastMessage] = useState<ToastMessage | null>(null);
  
  const toast = useCallback(({ title, description, variant = "default" }: ToastMessage) => {
    setToastMessage({ title, description, variant });
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  const ToastComponent: React.FC = () => toastMessage ? (
    <div
      className={`fixed top-4 right-4 p-4 rounded-lg shadow-xl text-white max-w-sm flex items-start space-x-4 z-50 transition-opacity duration-300 ${
        toastMessage.variant === "destructive" ? "bg-red-600" : "bg-red-600" // Use red for errors
      }`}
    >
      <div className="flex-1">
        <div className="font-bold">{toastMessage.title}</div>
        <p className="text-sm opacity-90">{toastMessage.description}</p>
      </div>
      <button onClick={() => setToastMessage(null)} className="p-1 -mr-2 opacity-75 hover:opacity-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  ) : null;
  
  return { toast, ToastComponent };
};

// Placeholder for Navigation
const Navigation: React.FC = () => (
  <header className="fixed top-0 left-0 w-full bg-white/90 backdrop-blur-sm shadow-md z-10">
    <div className="container mx-auto px-4 py-4 flex justify-between items-center">
      <div className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
        <Languages className="w-6 h-6 text-blue-600" />
        PlainSpeak App
      </div>
    </div>
  </header>
);
// --- END MOCK COMPONENTS & UTILITIES ---

// Utility for exponential backoff retry logic
const fetchWithRetry = async (url: string, options: RequestInit, retries: number = 5): Promise<Response> => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        if (response.ok) return response;
        if (response.status === 429 && i < retries - 1) {
          const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // Detailed error extraction from response body
        let errorDetail = "";
        try {
            const responseClone = response.clone();
            const responseText = await responseClone.text();
            
            const detailJson = JSON.parse(responseText);
            // Prioritize the structured error message if available
            errorDetail = detailJson.error?.message || responseText;
        } catch (e) {
            // Fallback if the body isn't parsable JSON
            errorDetail = `Could not parse response body. Status: ${response.status}`;
        }

        const trimmedDetail = errorDetail.substring(0, 150);
        // Construct clear error message including status code and detail
        const errorMessage = `API failed (Status ${response.status}): ${trimmedDetail}${errorDetail.length > 150 ? '...' : ''}`;
        throw new Error(errorMessage);
      } catch (error) {
        if (i === retries - 1) throw error as Error;
        // Wait before next retry
        const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    // Should be unreachable if retries > 0
    throw new Error("Maximum retry attempts reached");
};


const TranslatorApp: React.FC = () => {
  const [inputText, setInputText] = useState<string>("");
  const [translatedText, setTranslatedText] = useState<string>("");
  const [targetLanguage, setTargetLanguage] = useState<string>("english");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast, ToastComponent } = useToast();

  const languages: Language[] = [
    { value: "english", label: "English" },
    { value: "hindi", label: "Hindi" },
    { value: "bengali", label: "Bengali" },
    { value: "tamil", label: "Tamil" },
    { value: "telugu", label: "Telugu" },
    { value: "marathi", label: "Marathi" },
    { value: "gujarati", label: "Gujarati" },
    { value: "kannada", label: "Kannada" },
    { value: "malayalam", label: "Malayalam" },
    { value: "punjabi", label: "Punjabi" },
  ];

  const handleTranslate = useCallback(async () => {
    if (!inputText.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter text to convert/translate.",
        variant: "destructive",
      });
      return;
    }

    setTranslatedText("");
    setIsLoading(true);

    const apiKey = "AIzaSyC4biytwy_WrD0l6Kc7PyeH30Ss-_DRC0Q"; // Left empty for environment injection
    const model = "gemini-2.5-flash-preview-09-2025";
    // Construct the API URL, allowing the environment to inject the key (which should fix the 403)
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const systemPrompt: string = `You are an expert Plain Language converter and multilingual translator. Your task is to take complex, official, or difficult text and convert it into simple, easy-to-understand, conversational language for a student audience. The output must be entirely in the specified target language. Do not include any introductory or concluding phrases, or markdown formatting (like code blocks, titles, or lists), just the plain language text.`;

    const userQuery: string = `Convert the following official text to plain language, and translate it into ${targetLanguage}:\n\nOfficial Text:\n"""${inputText}"""`;

    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
    };

    try {
        await fetchWithRetry(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then(async (response) => {
            const result = await response.json();
            const generatedText: string = result.candidates?.[0]?.content?.parts?.[0]?.text || "";

            if (generatedText) {
                setTranslatedText(generatedText.trim());
                toast({
                    title: "Success",
                    description: "Plain language conversion completed!",
                    variant: "default",
                });
            } else {
                throw new Error("Received an empty or malformed response from the AI model.");
            }
        });


    } catch (error: any) {
        console.error("Translation error:", error);
        // This will display the detailed error message captured by fetchWithRetry
        toast({
            title: "Translation Failed",
            description: error.message || "An unknown error occurred during the API call.",
            variant: "destructive",
        });
    } finally {
      setIsLoading(false);
    }
  }, [inputText, targetLanguage, toast]);

  const currentLanguageLabel = languages.find(l => l.value === targetLanguage)?.label || 'Selected Language';

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navigation />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 mb-4 shadow-inner">
              <Languages className="w-10 h-10 text-blue-600" />
            </div>
            <h1 className="4xl:text-5xl font-extrabold text-gray-900 mb-2">
              PlainSpeak: Official Text Converter
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Convert complex jargon, regulations, and formal documents into clear, conversational, and multilingual plain language instantly.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-600">
                  Original (Complex) Text
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Paste official text, legal documents, or exam guidelines here..."
                  className="min-h-[350px] resize-none focus:border-blue-500"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
                <div className="mt-6 flex flex-col sm:flex-row items-stretch gap-4">
                  <Select
                    value={targetLanguage}
                    onValueChange={setTargetLanguage}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select target language" />
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
                    onClick={handleTranslate}
                    disabled={isLoading}
                    className="flex-shrink-0 min-w-[150px] transition-transform duration-150 active:scale-[0.98]"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Convert & Translate
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  Plain Language Output ({currentLanguageLabel})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="min-h-[350px] p-5 bg-green-50 rounded-lg border border-green-200 shadow-inner overflow-y-auto">
                  {translatedText ? (
                    <p className="whitespace-pre-wrap text-gray-800 leading-relaxed">{translatedText}</p>
                  ) : (
                    <p className="text-gray-500 italic">
                      Your plain language, conversational output will appear here after conversion.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <ToastComponent />
    </div>
  );
};

// Main App component wrapper
const App: React.FC = () => <TranslatorApp />;
export default App;